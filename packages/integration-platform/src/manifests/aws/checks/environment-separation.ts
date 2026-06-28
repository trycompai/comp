import { DescribeVpcsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  applyEnvironmentAliasEvidence,
  parseEnvironmentAliases,
  type EnvironmentAlias,
} from '../../environment-aliases';
import {
  classifyEnvironmentWithAliases,
  confirmsEnvironmentSeparation,
  envTagValues,
} from '../../environment-classification';
import {
  combineReadFailures,
  emitOutcomes,
  remediationForReadFailure,
  resolveAwsSessionOrFail,
  toReadFailure,
  type CheckOutcome,
  type ReadFailure,
} from './shared';

export interface VpcInfo {
  vpcId: string;
  region: string;
  environment: string | null;
}

function summarizeVpcs(vpcs: VpcInfo[]) {
  const sample = vpcs.slice(0, 50).map((v) => ({
    vpcId: v.vpcId,
    region: v.region,
    environment: v.environment ?? 'unclassified',
  }));
  const detected = [
    ...new Set(vpcs.map((v) => v.environment).filter((e): e is string => e !== null)),
  ];
  const unclassifiedVpcCount = vpcs.filter((v) => v.environment === null).length;

  return { sample, detected, unclassifiedVpcCount };
}

// Shown on every "could not confirm" outcome. AWS's recommended separation is a
// separate ACCOUNT per environment, which is invisible from one connection (one
// account's role), so a single-account result is the EXPECTED shape for those
// customers — guide, never accuse.
const ACCOUNT_GUIDANCE =
  'If you separate environments using a separate AWS account per environment (the recommended pattern), connect each environment account as its own connection — this check evaluates one account at a time. Otherwise separate prod/non-prod into distinct VPCs and tag each (Environment=production / Environment=staging). If your organization uses different environment names, configure Environment aliases (e.g. release=production), or upload an architecture diagram as evidence.';

/**
 * Classify a VPC into an environment from its tags: an explicit `environment`
 * tag value first, then the `Name` tag value. Only env-key tag values and the
 * Name tag are considered — arbitrary tag values are NOT scanned, so a stray
 * `team=dev-team` tag can't fabricate a second environment.
 */
export function classifyVpcEnv(
  tags: ReadonlyArray<{ Key?: string; Value?: string }> | undefined,
): string | null {
  return classifyVpcEnvWithAliases({ tags, aliases: [] });
}

export function classifyVpcEnvWithAliases({
  tags,
  aliases,
}: {
  tags: ReadonlyArray<{ Key?: string; Value?: string }> | undefined;
  aliases: readonly EnvironmentAlias[];
}): string | null {
  const tagMap: Record<string, string> = {};
  for (const t of tags ?? []) {
    if (typeof t.Key === 'string' && typeof t.Value === 'string') {
      tagMap[t.Key] = t.Value;
    }
  }
  const nameTag = Object.entries(tagMap).find(([k]) => k.toLowerCase() === 'name')?.[1];
  return classifyEnvironmentWithAliases({
    candidates: [...envTagValues(tagMap), nameTag],
    aliases,
  });
}

/**
 * Pure verdict from the account's non-default VPCs. PASS only when a PRODUCTION
 * environment is positively observed alongside at least one NON-PRODUCTION
 * environment; otherwise fail-with-guidance (never a silent pass). The PASS
 * wording is deliberately scoped to "within a single AWS account" — environment-
 * labeled VPCs prove network labeling, not cross-account isolation (they can be
 * peered / share the account boundary).
 */
export function evaluateEnvironmentSeparation(vpcs: VpcInfo[]): CheckOutcome[] {
  if (vpcs.length === 0) {
    return [
      {
        kind: 'fail',
        title: 'Could not confirm environment separation',
        description:
          'No non-default VPCs were found in this AWS account, so environment separation could not be evaluated here.',
        resourceType: 'aws-environment-separation',
        resourceId: 'vpcs',
        severity: 'low',
        remediation: ACCOUNT_GUIDANCE,
        evidence: { vpcCount: 0 },
      },
    ];
  }

  const { sample, detected, unclassifiedVpcCount } = summarizeVpcs(vpcs);

  // A confirmed pass requires a production environment separated from a
  // non-production one — two non-production VPCs alone do not demonstrate that
  // production is segregated.
  if (confirmsEnvironmentSeparation(detected)) {
    return [
      {
        kind: 'pass',
        title: 'Distinct environment-labeled VPCs found',
        description: `Detected production separated from non-production across non-default VPCs in this AWS account: ${detected.join(', ')}. This evidences environment-labeled network separation within a single account (not cross-account isolation).`,
        resourceType: 'aws-environment-separation',
        resourceId: 'vpcs',
        evidence: {
          detectedEnvironments: detected,
          vpcCount: vpcs.length,
          vpcs: sample,
          unclassifiedVpcCount,
        },
      },
    ];
  }

  const unclassifiedDetail =
    unclassifiedVpcCount > 0
      ? ` ${unclassifiedVpcCount} VPC(s) were unclassified and need an Environment tag or environment token in the Name tag.`
      : '';

  return [
    {
      kind: 'fail',
      title: 'Could not confirm environment separation',
      description:
        detected.length === 0
          ? `No VPC in this account could be classified by environment, so environment separation could not be confirmed.${unclassifiedDetail}`
          : `Detected environment(s) ${detected.join(', ')} among this account's VPCs, but could not confirm a production environment separated from a non-production one; this connection evaluates a single AWS account.${unclassifiedDetail}`,
      resourceType: 'aws-environment-separation',
      resourceId: 'vpcs',
      severity: 'low',
      remediation: ACCOUNT_GUIDANCE,
      evidence: {
        detectedEnvironments: detected,
        vpcCount: vpcs.length,
        vpcs: sample,
        unclassifiedVpcCount,
      },
    },
  ];
}

/**
 * Combine the VPCs we read with any per-region read failures into the outcomes
 * to emit. A region we couldn't read leaves coverage incomplete and is surfaced
 * as its own "could not verify" finding. A partial regional footprint must not
 * auto-complete the evidence task, even if the regions we did read already show
 * production and non-production VPCs.
 * When zero VPCs were read AND a region failed, only the region-failure finding
 * is returned — a "no VPCs" verdict layered on unread data would mislead.
 */
export function buildEnvironmentSeparationOutcomes(
  vpcs: VpcInfo[],
  regionFailures: ReadonlyArray<{ region: string; failure: ReadFailure }>,
): CheckOutcome[] {
  const separation = evaluateEnvironmentSeparation(vpcs);
  const confirmed = separation.some((o) => o.kind === 'pass');

  // No coverage gap → the verdict stands alone.
  if (regionFailures.length === 0) return separation;

  const regions = regionFailures.map((r) => r.region);
  const { sample, detected, unclassifiedVpcCount } = summarizeVpcs(vpcs);
  const regionFailure: CheckOutcome = {
    kind: 'fail',
    title: 'Could not verify VPCs in some regions',
    description: `VPCs could not be listed in: ${regions.join(', ')}, so environment separation is unverified in those regions.`,
    resourceType: 'aws-environment-separation',
    resourceId: `regions:${regions.join(',')}`,
    severity: 'medium',
    remediation: remediationForReadFailure(
      combineReadFailures(regionFailures.map((r) => r.failure)),
      'Grant ec2:DescribeVpcs to the integration role in all enabled regions, then re-run the check.',
    ),
    evidence: {
      failedRegions: regionFailures.map((r) => ({
        region: r.region,
        error: r.failure.error,
      })),
      vpcCount: vpcs.length,
      detectedEnvironments: detected,
      unclassifiedVpcCount,
      vpcs: sample,
    },
  };

  // Zero VPCs read + a region failure: the unverified-region finding already
  // tells the story on its own.
  if (vpcs.length === 0) return [regionFailure];

  // The scanned regions showed separation, but the account-level coverage is
  // incomplete. Return only the verification failure so the task does not
  // auto-complete from a partial regional footprint.
  if (confirmed) return [regionFailure];

  // Coverage gap AND we couldn't confirm from what we read: surface both —
  // they're consistent (both negative).
  return [regionFailure, ...separation];
}

/**
 * Separation of Environments check (heuristic, within-account). Lists every
 * non-default VPC across the account's regions, classifies each by its
 * Environment/Name tag, and passes when a production environment is found
 * alongside at least one non-production environment.
 * Account-per-environment separation is invisible from one connection (no
 * Organizations access), so a single-environment account fails with guidance to
 * connect each env account or upload a diagram — the task accepts manual
 * evidence either way.
 */
export const environmentSeparationCheck: IntegrationCheck = {
  id: 'aws-environment-separation',
  name: 'Separation of environments — production isolated from non-production',
  description:
    'Verify production and non-production workloads run in distinct VPCs within the AWS account.',
  service: 'ec2-vpc',
  taskMapping: TASK_TEMPLATES.separationOfEnvironments,
  run: async (ctx: CheckContext) => {
    const session = await resolveAwsSessionOrFail(ctx);
    if (!session) {
      ctx.log('AWS environment-separation check: connection not configured — skipping');
      return;
    }

    const vpcs: VpcInfo[] = [];
    const regionFailures: Array<{ region: string; failure: ReadFailure }> = [];
    const aliasesConfig = parseEnvironmentAliases(ctx.variables);
    if (aliasesConfig.invalidEntries.length > 0) {
      ctx.warn('AWS environment-separation check: ignored invalid environment aliases', {
        invalidEntries: aliasesConfig.invalidEntries,
      });
    }

    for (const region of session.regions) {
      try {
        const ec2 = new EC2Client({
          region,
          credentials: session.credentials,
          maxAttempts: 5,
        });
        let token: string | undefined;
        do {
          const resp = await ec2.send(
            new DescribeVpcsCommand({ NextToken: token, MaxResults: 1000 }),
          );
          for (const v of resp.Vpcs ?? []) {
            // Default VPCs ship in every region (usually untagged) and would
            // pollute the signal; only evaluate available, non-default VPCs.
            if (v.IsDefault === true) continue;
            if (v.State && v.State !== 'available') continue;
            vpcs.push({
              vpcId: v.VpcId ?? 'unknown',
              region,
              environment: classifyVpcEnvWithAliases({
                tags: v.Tags,
                aliases: aliasesConfig.aliases,
              }),
            });
          }
          token = resp.NextToken;
        } while (token);
      } catch (err) {
        const failure = toReadFailure(err);
        regionFailures.push({ region, failure });
        ctx.log(`VPC: could not list VPCs in ${region}: ${failure.error}`);
      }
    }

    emitOutcomes(
      ctx,
      applyEnvironmentAliasEvidence({
        items: buildEnvironmentSeparationOutcomes(vpcs, regionFailures),
        aliasesConfig,
      }),
    );
  },
};

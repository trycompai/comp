import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import type { CheckContext, FindingSeverity } from '../../../types';

export interface AwsSession {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
  regions: string[];
}

/**
 * Assume the customer's cross-account IAM role (role ARN + external ID from the
 * connection credentials) and return temporary credentials + the selected
 * regions. Returns null when the connection isn't configured — the check
 * should then no-op (no false pass).
 */
export async function assumeAwsSession(
  ctx: CheckContext,
): Promise<AwsSession | null> {
  const raw = ctx.credentials as Record<string, unknown>;
  const roleArn = typeof raw.roleArn === 'string' ? raw.roleArn : '';
  const externalId = typeof raw.externalId === 'string' ? raw.externalId : '';
  const regions = (
    Array.isArray(raw.regions)
      ? raw.regions.filter((r): r is string => typeof r === 'string')
      : typeof raw.region === 'string'
        ? [raw.region]
        : []
  ).filter((r) => r.trim().length > 0);

  if (!roleArn || !externalId || regions.length === 0) return null;

  const sts = new STSClient({ region: regions[0] });
  const res = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      ExternalId: externalId,
      RoleSessionName: 'CompEvidenceCheck',
      DurationSeconds: 3600,
    }),
  );
  const c = res.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) return null;

  return {
    credentials: {
      accessKeyId: c.AccessKeyId,
      secretAccessKey: c.SecretAccessKey,
      sessionToken: c.SessionToken,
    },
    regions,
  };
}

/**
 * Resolve an AWS session, distinguishing "connection not configured" (returns
 * null silently — a legitimate no-op) from "assume-role failed" (e.g. denied,
 * bad ARN/external ID, throttling). On an assume-role failure it emits a
 * "could not verify" finding and returns null, so the failure surfaces as
 * explicit evidence with remediation rather than as a bare check error (or a
 * false non-compliant verdict). Use this instead of assumeAwsSession directly.
 */
export async function resolveAwsSessionOrFail(
  ctx: CheckContext,
): Promise<AwsSession | null> {
  try {
    return await assumeAwsSession(ctx);
  } catch (err) {
    ctx.fail({
      title: 'Could not assume AWS role',
      description:
        'The cross-account IAM role could not be assumed, so this check could not be verified.',
      resourceType: 'aws-account',
      resourceId: 'account',
      severity: 'medium',
      remediation:
        'Verify the role ARN and external ID are correct and the role trust policy allows Comp to assume it, then re-run the check.',
      evidence: { error: err instanceof Error ? err.message : String(err) },
    });
    return null;
  }
}

/** A provider-agnostic pass/fail outcome produced by a pure evaluator. */
export interface CheckOutcome {
  kind: 'pass' | 'fail';
  title: string;
  description: string;
  resourceType: string;
  resourceId: string;
  severity?: FindingSeverity;
  remediation?: string;
  evidence?: Record<string, unknown>;
}

/** Map pure evaluator outcomes onto ctx.pass / ctx.fail. */
export function emitOutcomes(ctx: CheckContext, outcomes: CheckOutcome[]): void {
  for (const o of outcomes) {
    if (o.kind === 'pass') {
      ctx.pass({
        title: o.title,
        description: o.description,
        resourceType: o.resourceType,
        resourceId: o.resourceId,
        evidence: o.evidence ?? {},
      });
    } else {
      ctx.fail({
        title: o.title,
        description: o.description,
        resourceType: o.resourceType,
        resourceId: o.resourceId,
        severity: o.severity ?? 'medium',
        remediation: o.remediation ?? 'Review and remediate this finding.',
        evidence: o.evidence,
      });
    }
  }
}

import {
  CloudTrailClient,
  DescribeTrailsCommand,
  type DescribeTrailsCommandOutput,
  GetTrailStatusCommand,
} from '@aws-sdk/client-cloudtrail';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { resolveAwsSessionOrFail, type CheckOutcome, emitOutcomes } from './shared';

export interface TrailInfo {
  name: string;
  multiRegion: boolean;
  logValidation: boolean;
  /** GetTrailStatus.IsLogging — a trail can be configured but stopped. */
  logging: boolean;
  /**
   * Whether the logging status was actually read. Defaults to known/true when
   * omitted. When a multi-region + validated candidate trail's status could not
   * be read, this is set to false so it is NOT misreported as logging=false.
   */
  loggingKnown?: boolean;
}

export function evaluateCloudTrail(trails: TrailInfo[]): CheckOutcome[] {
  const good = trails.find(
    (t) => t.multiRegion && t.logValidation && t.logging && t.loggingKnown !== false,
  );
  if (good) {
    return [
      {
        kind: 'pass',
        title: 'Multi-region CloudTrail logging with validation',
        description: `Trail "${good.name}" is multi-region, actively logging, with log file validation enabled.`,
        resourceType: 'aws-cloudtrail',
        resourceId: good.name,
        evidence: { trail: good.name },
      },
    ];
  }
  // No confirmed-good trail. If an otherwise-compliant (multi-region + validated)
  // candidate exists whose logging status could not be read, we must NOT record
  // a clean run on unverified data (ERROR-READS-NEVER-SILENT-PASS) — but we also
  // can't assert it is actively NOT logging. Emit a "could not verify" failure
  // so the control isn't silently treated as satisfied.
  const unverifiableCandidate = trails.find(
    (t) => t.multiRegion && t.logValidation && t.loggingKnown === false,
  );
  if (unverifiableCandidate) {
    return [
      {
        kind: 'fail',
        title: 'Could not verify CloudTrail logging status',
        description: `Trail "${unverifiableCandidate.name}" is multi-region with log file validation, but its logging status (GetTrailStatus) could not be read, so active logging is unverified.`,
        resourceType: 'aws-cloudtrail',
        resourceId: unverifiableCandidate.name,
        severity: 'medium',
        remediation:
          'Grant cloudtrail:GetTrailStatus to the integration role so logging status can be verified, then re-run the check.',
        evidence: { trail: unverifiableCandidate.name },
      },
    ];
  }
  if (trails.length === 0) {
    return [
      {
        kind: 'fail',
        title: 'No CloudTrail configured',
        description: 'No CloudTrail trail is configured for the account.',
        resourceType: 'aws-cloudtrail',
        resourceId: 'account',
        severity: 'high',
        remediation: 'Create a multi-region CloudTrail trail with log file validation enabled.',
      },
    ];
  }
  return [
    {
      kind: 'fail',
      title: 'No compliant CloudTrail trail',
      description:
        'No trail is multi-region, actively logging, AND has log file validation enabled.',
      resourceType: 'aws-cloudtrail',
      resourceId: 'account',
      severity: 'medium',
      remediation:
        'Ensure a CloudTrail trail is multi-region, logging is started, and log file validation is enabled.',
      evidence: { trails: trails.map((t) => t.name) },
    },
  ];
}

export const cloudTrailEnabledCheck: IntegrationCheck = {
  id: 'aws-cloudtrail-enabled',
  name: 'CloudTrail — multi-region trail logging with validation',
  description:
    'Verify a multi-region CloudTrail trail is actively logging with log file validation.',
  service: 'cloudtrail',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  run: async (ctx: CheckContext) => {
    const session = await resolveAwsSessionOrFail(ctx);
    if (!session) {
      ctx.log('AWS CloudTrail check: connection not configured — skipping');
      return;
    }

    // A single-region trail is only returned by DescribeTrails in its home
    // region, so scanning just one region can miss trails and misreport "No
    // CloudTrail configured". Describe trails in every selected region and
    // dedupe by TrailARN before evaluating.
    const seenArns = new Set<string>();
    const trails: TrailInfo[] = [];
    const failedRegions: string[] = [];

    for (const region of session.regions) {
      const ct = new CloudTrailClient({
        region,
        credentials: session.credentials,
      });

      let trailList: DescribeTrailsCommandOutput['trailList'];
      try {
        const resp = await ct.send(new DescribeTrailsCommand({}));
        trailList = resp.trailList;
      } catch (err) {
        failedRegions.push(region);
        ctx.log(
          `CloudTrail: could not list trails in ${region}: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      for (const t of trailList ?? []) {
        const arnKey = t.TrailARN ?? `${region}/${t.Name ?? 'unknown'}`;
        if (seenArns.has(arnKey)) continue;
        seenArns.add(arnKey);

        const multiRegion = t.IsMultiRegionTrail === true;
        const logValidation = t.LogFileValidationEnabled === true;
        let logging = false;
        // Track whether the logging status was actually read so a failed
        // GetTrailStatus is not misreported as logging=false.
        let loggingKnown = true;
        // Logging status only matters for otherwise-compliant trails.
        if (multiRegion && logValidation && t.TrailARN) {
          try {
            const status = await ct.send(new GetTrailStatusCommand({ Name: t.TrailARN }));
            logging = status.IsLogging === true;
          } catch (err) {
            loggingKnown = false;
            ctx.log(
              `CloudTrail: could not read logging status for ${t.Name ?? t.TrailARN}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
        trails.push({
          name: t.Name ?? 'unknown',
          multiRegion,
          logValidation,
          logging,
          loggingKnown,
        });
      }
    }

    // If we found no trails AND at least one region's DescribeTrails failed, we
    // can't conclude "No CloudTrail configured" (that would be a false high on a
    // permissions/transient error) — report it as unverified instead.
    if (trails.length === 0 && failedRegions.length > 0) {
      ctx.fail({
        title: 'Could not verify CloudTrail configuration',
        description: `CloudTrail trails could not be listed in: ${failedRegions.join(', ')}, so trail configuration is unverified.`,
        resourceType: 'aws-cloudtrail',
        resourceId: 'account',
        severity: 'medium',
        remediation:
          'Grant cloudtrail:DescribeTrails to the integration role in all enabled regions, then re-run the check.',
        evidence: { failedRegions },
      });
      return;
    }

    emitOutcomes(ctx, evaluateCloudTrail(trails));
  },
};

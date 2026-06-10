import {
  CloudTrailClient,
  DescribeTrailsCommand,
  type DescribeTrailsCommandOutput,
  GetTrailStatusCommand,
} from '@aws-sdk/client-cloudtrail';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  combineReadFailures,
  remediationForReadFailure,
  resolveAwsSessionOrFail,
  toReadFailure,
  type CheckOutcome,
  type ReadFailure,
  emitOutcomes,
} from './shared';

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
  /** set when GetTrailStatus failed — the real error, surfaced in evidence */
  statusReadFailure?: ReadFailure;
}

export interface CloudTrailEvalOptions {
  /** regions DescribeTrails ran in — shown when no trail is found */
  scannedRegions?: string[];
}

export function evaluateCloudTrail(
  trails: TrailInfo[],
  opts?: CloudTrailEvalOptions,
): CheckOutcome[] {
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
        evidence: { trail: good.name, multiRegion: good.multiRegion, logging: good.logging, logValidation: good.logValidation },
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
    const failure = unverifiableCandidate.statusReadFailure;
    return [
      {
        kind: 'fail',
        title: 'Could not verify CloudTrail logging status',
        description: `Trail "${unverifiableCandidate.name}" is multi-region with log file validation, but its logging status (GetTrailStatus) could not be read${failure ? ` (${failure.error})` : ''}, so active logging is unverified.`,
        resourceType: 'aws-cloudtrail',
        resourceId: unverifiableCandidate.name,
        severity: 'medium',
        remediation: remediationForReadFailure(
          failure,
          'Grant cloudtrail:GetTrailStatus to the integration role so logging status can be verified, then re-run the check.',
        ),
        evidence: {
          trail: unverifiableCandidate.name,
          ...(failure ? { readError: failure.error } : {}),
        },
      },
    ];
  }
  if (trails.length === 0) {
    const scanned = opts?.scannedRegions ?? [];
    return [
      {
        kind: 'fail',
        title: 'No CloudTrail trail found',
        // A multi-region trail shadows into every region, so it would be
        // visible in any scanned region — only single-region trails homed
        // outside the scanned regions (non-compliant anyway) are invisible.
        description: `No CloudTrail trail was found${scanned.length > 0 ? ` in the scanned regions (${scanned.join(', ')})` : ''}. A compliant multi-region trail would be visible in any scanned region.`,
        resourceType: 'aws-cloudtrail',
        resourceId: 'account',
        severity: 'high',
        remediation: 'Create a multi-region CloudTrail trail with log file validation enabled.',
        evidence: {
          trailsFound: 0,
          ...(scanned.length > 0 ? { scannedRegions: scanned } : {}),
        },
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
      evidence: {
        trails: trails.map((t) => ({
          name: t.name,
          multiRegion: t.multiRegion,
          logging: t.logging,
          logValidation: t.logValidation,
        })),
      },
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
    const regionFailures: Array<{ region: string; failure: ReadFailure }> = [];

    for (const region of session.regions) {
      const ct = new CloudTrailClient({
        region,
        credentials: session.credentials,
        // Reads are idempotent; extra attempts ride out transient network or
        // throttling failures during the scheduled-run herd.
        maxAttempts: 5,
      });

      let trailList: DescribeTrailsCommandOutput['trailList'];
      try {
        const resp = await ct.send(new DescribeTrailsCommand({}));
        trailList = resp.trailList;
      } catch (err) {
        const failure = toReadFailure(err);
        regionFailures.push({ region, failure });
        ctx.log(`CloudTrail: could not list trails in ${region}: ${failure.error}`);
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
        let statusReadFailure: ReadFailure | undefined;
        // Logging status only matters for otherwise-compliant trails.
        if (multiRegion && logValidation && t.TrailARN) {
          // Query GetTrailStatus against the trail's home region. A multi-region
          // trail is returned as a shadow in every scanned region; reusing the
          // scan-region client when it differs from the home region can fail on
          // some SDK paths and produce a false "could not verify". Reuse `ct`
          // when the scan region already is the home region.
          const homeRegion = t.HomeRegion ?? region;
          const statusClient =
            homeRegion === region
              ? ct
              : new CloudTrailClient({
                  region: homeRegion,
                  credentials: session.credentials,
                  maxAttempts: 5,
                });
          try {
            const status = await statusClient.send(
              new GetTrailStatusCommand({ Name: t.TrailARN }),
            );
            logging = status.IsLogging === true;
          } catch (err) {
            loggingKnown = false;
            statusReadFailure = toReadFailure(err);
            ctx.log(
              `CloudTrail: could not read logging status for ${t.Name ?? t.TrailARN}: ${statusReadFailure.error}`,
            );
          }
        }
        trails.push({
          name: t.Name ?? 'unknown',
          multiRegion,
          logValidation,
          logging,
          loggingKnown,
          statusReadFailure,
        });
      }
    }

    // If we found no trails AND at least one region's DescribeTrails failed, we
    // can't conclude "No CloudTrail configured" (that would be a false high on a
    // permissions/transient error) — report it as unverified instead.
    if (trails.length === 0 && regionFailures.length > 0) {
      const combined = combineReadFailures(regionFailures.map((r) => r.failure));
      ctx.fail({
        title: 'Could not verify CloudTrail configuration',
        description: `CloudTrail trails could not be listed in: ${regionFailures.map((r) => r.region).join(', ')}, so trail configuration is unverified.`,
        resourceType: 'aws-cloudtrail',
        resourceId: 'account',
        severity: 'medium',
        remediation: remediationForReadFailure(
          combined,
          'Grant cloudtrail:DescribeTrails to the integration role in all enabled regions, then re-run the check.',
        ),
        evidence: {
          failedRegions: regionFailures.map((r) => ({
            region: r.region,
            error: r.failure.error,
          })),
        },
      });
      return;
    }

    emitOutcomes(
      ctx,
      evaluateCloudTrail(trails, { scannedRegions: session.regions }),
    );
  },
};

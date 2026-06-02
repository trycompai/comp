import {
  CloudTrailClient,
  DescribeTrailsCommand,
  GetTrailStatusCommand,
} from '@aws-sdk/client-cloudtrail';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { assumeAwsSession, type CheckOutcome, emitOutcomes } from './shared';

export interface TrailInfo {
  name: string;
  multiRegion: boolean;
  logValidation: boolean;
  /** GetTrailStatus.IsLogging — a trail can be configured but stopped. */
  logging: boolean;
}

export function evaluateCloudTrail(trails: TrailInfo[]): CheckOutcome[] {
  const good = trails.find((t) => t.multiRegion && t.logValidation && t.logging);
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
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS CloudTrail check: connection not configured — skipping');
      return;
    }
    const ct = new CloudTrailClient({
      region: session.regions[0],
      credentials: session.credentials,
    });
    const resp = await ct.send(new DescribeTrailsCommand({}));
    const trailList = resp.trailList ?? [];

    const trails: TrailInfo[] = [];
    for (const t of trailList) {
      const multiRegion = t.IsMultiRegionTrail === true;
      const logValidation = t.LogFileValidationEnabled === true;
      let logging = false;
      // Logging status only matters for otherwise-compliant trails.
      if (multiRegion && logValidation && t.TrailARN) {
        try {
          const status = await ct.send(new GetTrailStatusCommand({ Name: t.TrailARN }));
          logging = status.IsLogging === true;
        } catch (err) {
          ctx.log(
            `CloudTrail: could not read logging status for ${t.Name ?? t.TrailARN}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      trails.push({ name: t.Name ?? 'unknown', multiRegion, logValidation, logging });
    }
    emitOutcomes(ctx, evaluateCloudTrail(trails));
  },
};

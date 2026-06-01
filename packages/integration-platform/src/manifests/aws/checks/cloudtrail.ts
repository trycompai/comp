import { CloudTrailClient, DescribeTrailsCommand } from '@aws-sdk/client-cloudtrail';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { assumeAwsSession, type CheckOutcome, emitOutcomes } from './shared';

export interface TrailInfo {
  name: string;
  multiRegion: boolean;
  logValidation: boolean;
}

export function evaluateCloudTrail(trails: TrailInfo[]): CheckOutcome[] {
  const good = trails.find((t) => t.multiRegion && t.logValidation);
  if (good) {
    return [
      {
        kind: 'pass',
        title: 'Multi-region CloudTrail with log validation',
        description: `Trail "${good.name}" is multi-region with log file validation enabled.`,
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
        'No trail is both multi-region and has log file validation enabled.',
      resourceType: 'aws-cloudtrail',
      resourceId: 'account',
      severity: 'medium',
      remediation:
        'Enable multi-region coverage and log file validation on a CloudTrail trail.',
      evidence: { trails: trails.map((t) => t.name) },
    },
  ];
}

export const cloudTrailEnabledCheck: IntegrationCheck = {
  id: 'aws-cloudtrail-enabled',
  name: 'CloudTrail — multi-region trail with log validation',
  description:
    'Verify a multi-region CloudTrail trail with log file validation is configured.',
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
    const trails: TrailInfo[] = (resp.trailList ?? []).map((t) => ({
      name: t.Name ?? 'unknown',
      multiRegion: t.IsMultiRegionTrail === true,
      logValidation: t.LogFileValidationEnabled === true,
    }));
    emitOutcomes(ctx, evaluateCloudTrail(trails));
  },
};

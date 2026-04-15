import {
  CloudTrailClient,
  DescribeTrailsCommand,
  GetTrailStatusCommand,
} from '@aws-sdk/client-cloudtrail';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class CloudTrailAdapter implements AwsServiceAdapter {
  readonly serviceId = 'cloudtrail';
  readonly isGlobal = true;

  async scan(params: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const { credentials, region, accountId } = params;
    const client = new CloudTrailClient({ region, credentials });

    const findings: SecurityFinding[] = [];

    const trailsResp = await client.send(new DescribeTrailsCommand({}));
    const trails = trailsResp.trailList || [];

    if (trails.length === 0) {
      findings.push(
        this.makeFinding({
          id: 'cloudtrail-no-trails',
          title: 'No CloudTrail trails configured',
          description:
            'No CloudTrail trails exist. API activity is not being logged.',
          severity: 'critical',
          remediation:
            'Create a multi-region trail using cloudtrail:CreateTrailCommand with Name set to "compai-cloudtrail", S3BucketName set to the target logging bucket, IsMultiRegionTrail set to true, and EnableLogFileValidation set to true. Then start logging with cloudtrail:StartLoggingCommand using the trail Name. Rollback by calling cloudtrail:StopLoggingCommand and then cloudtrail:DeleteTrailCommand with the trail Name.',
          passed: false,
          accountId,
        }),
      );
      return findings;
    }

    const hasMultiRegion = trails.some((t) => t.IsMultiRegionTrail);
    if (!hasMultiRegion) {
      findings.push(
        this.makeFinding({
          id: 'cloudtrail-no-multi-region',
          title: 'No multi-region CloudTrail trail configured',
          description:
            'None of the configured trails have multi-region logging enabled. Activity in other regions may not be captured.',
          severity: 'high',
          remediation:
            'Use cloudtrail:UpdateTrailCommand with the trail Name and IsMultiRegionTrail set to true. Rollback by calling cloudtrail:UpdateTrailCommand with IsMultiRegionTrail set to false.',
          passed: false,
          accountId,
        }),
      );
    } else {
      findings.push(
        this.makeFinding({
          id: 'cloudtrail-multi-region-ok',
          title: 'Multi-region CloudTrail trail is configured',
          description: 'At least one trail has multi-region logging enabled.',
          severity: 'info',
          passed: true,
          accountId,
        }),
      );
    }

    for (const trail of trails) {
      if (!trail.TrailARN || !trail.Name) continue;

      const statusResp = await client.send(
        new GetTrailStatusCommand({ Name: trail.TrailARN }),
      );

      if (!statusResp.IsLogging) {
        findings.push(
          this.makeFinding({
            id: `cloudtrail-not-logging-${trail.Name}`,
            title: `CloudTrail trail "${trail.Name}" is not logging`,
            description: `Trail ${trail.Name} exists but logging is disabled.`,
            severity: 'high',
            resourceId: trail.TrailARN,
            remediation: `Use cloudtrail:StartLoggingCommand with Name set to the trail ARN for "${trail.Name}". Rollback by calling cloudtrail:StopLoggingCommand with the same Name.`,
            passed: false,
            accountId,
          }),
        );
      }

      if (!trail.LogFileValidationEnabled) {
        findings.push(
          this.makeFinding({
            id: `cloudtrail-no-validation-${trail.Name}`,
            title: `CloudTrail trail "${trail.Name}" has log file validation disabled`,
            description: `Trail ${trail.Name} does not validate log file integrity. Tampered logs would go undetected.`,
            severity: 'medium',
            resourceId: trail.TrailARN,
            remediation: `Use cloudtrail:UpdateTrailCommand with Name set to "${trail.Name}" and EnableLogFileValidation set to true. Rollback by calling cloudtrail:UpdateTrailCommand with EnableLogFileValidation set to false.`,
            passed: false,
            accountId,
          }),
        );
      } else {
        findings.push(
          this.makeFinding({
            id: `cloudtrail-validation-ok-${trail.Name}`,
            title: `CloudTrail trail "${trail.Name}" has log file validation enabled`,
            description: `Trail ${trail.Name} validates log file integrity.`,
            severity: 'info',
            resourceId: trail.TrailARN,
            passed: true,
            accountId,
          }),
        );
      }
    }

    return findings;
  }

  private makeFinding(opts: {
    id: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    resourceId?: string;
    remediation?: string;
    passed: boolean;
    accountId?: string;
  }): SecurityFinding {
    return {
      id: opts.id,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'AwsCloudTrailTrail',
      resourceId: opts.resourceId || 'account-level',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        service: 'CloudTrail',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}

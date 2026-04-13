import {
  GuardDutyClient,
  ListDetectorsCommand,
  GetDetectorCommand,
} from '@aws-sdk/client-guardduty';
import {
  EC2Client,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class GuardDutyAdapter implements AwsServiceAdapter {
  readonly serviceId = 'guardduty';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new GuardDutyClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if there are any resources in this region
    try {
      const ec2Client = new EC2Client({ credentials, region });
      const ec2Resp = await ec2Client.send(
        new DescribeInstancesCommand({ MaxResults: 5 }),
      );
      const hasEc2 = (ec2Resp.Reservations ?? []).some(
        (r) => (r.Instances ?? []).length > 0,
      );

      if (!hasEc2) {
        const lambdaClient = new LambdaClient({ credentials, region });
        const lambdaResp = await lambdaClient.send(
          new ListFunctionsCommand({ MaxItems: 1 }),
        );
        const hasLambda = (lambdaResp.Functions ?? []).length > 0;

        if (!hasLambda) return [];
      }
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    try {
      const { DetectorIds } = await client.send(
        new ListDetectorsCommand({}),
      );

      if (!DetectorIds || DetectorIds.length === 0) {
        findings.push(
          this.makeFinding({
            id: `guardduty-not-enabled-${region}`,
            title: 'GuardDuty not enabled',
            description: `GuardDuty is not enabled in ${region}. No detectors found.`,
            severity: 'high',
            resourceId: `arn:aws:guardduty:${region}`,
            remediation: 'Step 1: Ensure a service-linked role exists by calling iam:CreateServiceLinkedRoleCommand with AWSServiceName set to "guardduty.amazonaws.com" (skip if the role already exists). Step 2: Use guardduty:CreateDetectorCommand with Enable set to true. Rollback by calling guardduty:DeleteDetectorCommand with the DetectorId returned from creation.',
          }),
        );
        return findings;
      }

      for (const detectorId of DetectorIds) {
        const detector = await client.send(
          new GetDetectorCommand({ DetectorId: detectorId }),
        );

        if (detector.Status !== 'ENABLED') {
          findings.push(
            this.makeFinding({
              id: `guardduty-disabled-${detectorId}`,
              title: 'GuardDuty detector is disabled',
              description: `GuardDuty detector ${detectorId} in ${region} is not enabled.`,
              severity: 'high',
              resourceId: detectorId,
              remediation: `Use guardduty:UpdateDetectorCommand with DetectorId set to "${detectorId}" and Enable set to true. Rollback by calling guardduty:UpdateDetectorCommand with DetectorId set to "${detectorId}" and Enable set to false.`,
            }),
          );
        } else {
          findings.push(
            this.makeFinding({
              id: `guardduty-enabled-${detectorId}`,
              title: 'GuardDuty detector is enabled',
              description: `GuardDuty detector ${detectorId} in ${region} is enabled.`,
              severity: 'info',
              resourceId: detectorId,
              passed: true,
            }),
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(
    params: Omit<SecurityFinding, 'resourceType' | 'createdAt'> & {
      remediation?: string;
    },
  ): SecurityFinding {
    return {
      ...params,
      resourceType: 'AwsGuardDutyDetector',
      evidence: { ...params.evidence, findingKey: params.id },
      createdAt: new Date().toISOString(),
    };
  }
}

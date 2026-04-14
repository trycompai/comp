import {
  GuardDutyClient,
  ListDetectorsCommand,
  GetDetectorCommand,
} from '@aws-sdk/client-guardduty';
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

    try {
      const { DetectorIds } = await client.send(new ListDetectorsCommand({}));

      if (!DetectorIds || DetectorIds.length === 0) {
        findings.push(
          this.makeFinding({
            id: `guardduty-not-enabled-${region}`,
            title: 'GuardDuty not enabled',
            description: `GuardDuty is not enabled in ${region}. No detectors found.`,
            severity: 'high',
            resourceId: `arn:aws:guardduty:${region}`,
            remediation:
              'Step 1: Ensure a service-linked role exists by calling iam:CreateServiceLinkedRoleCommand with AWSServiceName set to "guardduty.amazonaws.com" (skip if the role already exists). Step 2: Use guardduty:CreateDetectorCommand with Enable set to true. Rollback by calling guardduty:DeleteDetectorCommand with the DetectorId returned from creation.',
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

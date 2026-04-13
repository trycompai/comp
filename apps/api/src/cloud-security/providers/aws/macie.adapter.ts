import {
  Macie2Client,
  GetMacieSessionCommand,
} from '@aws-sdk/client-macie2';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class MacieAdapter implements AwsServiceAdapter {
  readonly serviceId = 'macie';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new Macie2Client({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if there are any S3 buckets
    try {
      const s3Client = new S3Client({ credentials, region });
      const s3Resp = await s3Client.send(new ListBucketsCommand({}));
      if ((s3Resp.Buckets ?? []).length === 0) return [];
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    try {
      const session = await client.send(new GetMacieSessionCommand({}));

      if (session.status === 'ENABLED') {
        findings.push(
          this.makeFinding({
            id: `macie-enabled-${region}`,
            title: 'Macie is enabled',
            description: `Amazon Macie is enabled in ${region}.`,
            severity: 'info',
            resourceId: `arn:aws:macie2:${region}`,
            passed: true,
          }),
        );
      } else {
        findings.push(
          this.makeFinding({
            id: `macie-not-enabled-${region}`,
            title: 'Macie not enabled',
            description: `Amazon Macie is not enabled in ${region}.`,
            severity: 'medium',
            resourceId: `arn:aws:macie2:${region}`,
            remediation:
              `Use macie2:EnableMacieCommand with status set to 'ENABLED' and findingPublishingFrequency set to 'FIFTEEN_MINUTES' (or 'ONE_HOUR', 'SIX_HOURS'). Rollback: use macie2:DisableMacieCommand. Note: enabling Macie incurs costs based on data scanned.`,
          }),
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];

      if (msg.includes('not enabled') || msg.includes('Macie is not enabled')) {
        findings.push(
          this.makeFinding({
            id: `macie-not-enabled-${region}`,
            title: 'Macie not enabled',
            description: `Amazon Macie is not enabled in ${region}.`,
            severity: 'medium',
            resourceId: `arn:aws:macie2:${region}`,
            remediation:
              `Use macie2:EnableMacieCommand with status set to 'ENABLED' and findingPublishingFrequency set to 'FIFTEEN_MINUTES' (or 'ONE_HOUR', 'SIX_HOURS'). Rollback: use macie2:DisableMacieCommand. Note: enabling Macie incurs costs based on data scanned.`,
          }),
        );
        return findings;
      }

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
      evidence: { ...(params.evidence ?? {}), findingKey: params.id },
      resourceType: 'AwsMacieSession',
      createdAt: new Date().toISOString(),
    };
  }
}

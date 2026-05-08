import {
  KMSClient,
  ListKeysCommand,
  DescribeKeyCommand,
  GetKeyRotationStatusCommand,
} from '@aws-sdk/client-kms';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class KmsAdapter implements AwsServiceAdapter {
  readonly serviceId = 'kms';
  readonly isGlobal = false;

  async scan(params: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const { credentials, region, accountId } = params;
    const client = new KMSClient({ region, credentials });

    const findings: SecurityFinding[] = [];
    let marker: string | undefined;

    do {
      const resp = await client.send(
        new ListKeysCommand({ Marker: marker, Limit: 100 }),
      );

      for (const key of resp.Keys || []) {
        if (!key.KeyId) continue;

        const keyFindings = await this.checkKey(
          client,
          key.KeyId,
          region,
          accountId,
        );
        findings.push(...keyFindings);
      }

      marker = resp.Truncated ? resp.NextMarker : undefined;
    } while (marker);

    return findings;
  }

  private async checkKey(
    client: KMSClient,
    keyId: string,
    region: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const descResp = await client.send(
      new DescribeKeyCommand({ KeyId: keyId }),
    );
    const meta = descResp.KeyMetadata;
    if (!meta) return [];

    // Only check customer-managed symmetric keys
    if (meta.KeyManager !== 'CUSTOMER') return [];
    if (meta.KeySpec !== 'SYMMETRIC_DEFAULT') return [];
    if (meta.KeyState !== 'Enabled') return [];

    const keyArn = meta.Arn || keyId;
    const description = meta.Description || keyId;

    try {
      const rotResp = await client.send(
        new GetKeyRotationStatusCommand({ KeyId: keyId }),
      );

      if (!rotResp.KeyRotationEnabled) {
        return [
          this.makeFinding({
            id: `kms-no-rotation-${keyId}`,
            title: `KMS key "${description}" does not have automatic rotation enabled (${region})`,
            description: `Customer-managed KMS key ${keyId} does not have automatic annual rotation enabled. CIS Benchmark 3.8 requires automatic key rotation.`,
            severity: 'medium',
            resourceId: keyArn,
            remediation: `Use kms:EnableKeyRotationCommand with KeyId set to the key ARN "${keyArn}". Rollback by calling kms:DisableKeyRotationCommand with the same KeyId.`,
            passed: false,
            accountId,
            region,
          }),
        ];
      }

      return [
        this.makeFinding({
          id: `kms-rotation-${keyId}`,
          title: `KMS key "${description}" has automatic rotation enabled (${region})`,
          description: `Automatic key rotation is enabled for KMS key ${keyId}.`,
          severity: 'info',
          resourceId: keyArn,
          passed: true,
          accountId,
          region,
        }),
      ];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }
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
    region?: string;
  }): SecurityFinding {
    return {
      id: opts.id,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'AwsKmsKey',
      resourceId: opts.resourceId || 'unknown',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        region: opts.region,
        service: 'KMS',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}

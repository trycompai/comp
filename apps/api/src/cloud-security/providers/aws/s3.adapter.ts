import {
  S3Client,
  ListBucketsCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
} from '@aws-sdk/client-s3';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

const MAX_BUCKETS = 100;

export class S3Adapter implements AwsServiceAdapter {
  readonly serviceId = 's3';
  readonly isGlobal = true;

  async scan(params: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const { credentials, region, accountId } = params;
    const client = new S3Client({ region, credentials });

    const findings: SecurityFinding[] = [];

    const listResp = await client.send(new ListBucketsCommand({}));
    const buckets = (listResp.Buckets || []).slice(0, MAX_BUCKETS);

    if (buckets.length === 0) return findings;

    for (const bucket of buckets) {
      if (!bucket.Name) continue;

      const results = await Promise.allSettled([
        this.checkPublicAccess(client, bucket.Name, accountId),
        this.checkEncryption(client, bucket.Name, accountId),
        this.checkVersioning(client, bucket.Name, accountId),
      ]);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          findings.push(...result.value);
        }
      }
    }

    return findings;
  }

  private async checkPublicAccess(
    client: S3Client,
    bucketName: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    try {
      const resp = await client.send(
        new GetPublicAccessBlockCommand({ Bucket: bucketName }),
      );
      const config = resp.PublicAccessBlockConfiguration;

      if (
        !config?.BlockPublicAcls ||
        !config?.BlockPublicPolicy ||
        !config?.IgnorePublicAcls ||
        !config?.RestrictPublicBuckets
      ) {
        return [
          this.makeFinding({
            id: `s3-public-access-${bucketName}`,
            title: `S3 bucket "${bucketName}" does not block all public access`,
            description: `Bucket ${bucketName} has incomplete public access block settings. All four public access block settings should be enabled.`,
            severity: 'high',
            resourceId: `arn:aws:s3:::${bucketName}`,
            remediation: `Use s3:PutPublicAccessBlockCommand with Bucket set to "${bucketName}" and PublicAccessBlockConfiguration with BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, and RestrictPublicBuckets all set to true. Rollback by restoring previous PublicAccessBlockConfiguration settings.`,
            passed: false,
            accountId,
          }),
        ];
      }

      return [
        this.makeFinding({
          id: `s3-public-access-${bucketName}`,
          title: `S3 bucket "${bucketName}" blocks all public access`,
          description: `All public access block settings are enabled.`,
          severity: 'info',
          resourceId: `arn:aws:s3:::${bucketName}`,
          passed: true,
          accountId,
        }),
      ];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // No public access block configured at all
      if (msg.includes('NoSuchPublicAccessBlockConfiguration')) {
        return [
          this.makeFinding({
            id: `s3-public-access-${bucketName}`,
            title: `S3 bucket "${bucketName}" has no public access block configured`,
            description: `Bucket ${bucketName} has no public access block configuration, making it potentially publicly accessible.`,
            severity: 'high',
            resourceId: `arn:aws:s3:::${bucketName}`,
            remediation: `Use s3:PutPublicAccessBlockCommand with Bucket set to "${bucketName}" and PublicAccessBlockConfiguration with BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, and RestrictPublicBuckets all set to true. Rollback by removing the public access block configuration via s3:DeletePublicAccessBlockCommand.`,
            passed: false,
            accountId,
          }),
        ];
      }
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }
  }

  private async checkEncryption(
    client: S3Client,
    bucketName: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    try {
      const resp = await client.send(
        new GetBucketEncryptionCommand({ Bucket: bucketName }),
      );
      const rules =
        resp.ServerSideEncryptionConfiguration?.Rules || [];

      if (rules.length === 0) {
        return [
          this.makeFinding({
            id: `s3-encryption-${bucketName}`,
            title: `S3 bucket "${bucketName}" has no default encryption`,
            description: `Bucket ${bucketName} does not have server-side encryption configured by default.`,
            severity: 'high',
            resourceId: `arn:aws:s3:::${bucketName}`,
            remediation: `Use s3:PutBucketEncryptionCommand with Bucket set to "${bucketName}" and ServerSideEncryptionConfiguration.Rules containing a rule with ApplyServerSideEncryptionByDefault.SSEAlgorithm set to 'AES256'. For KMS encryption, set SSEAlgorithm to 'aws:kms' and provide KMSMasterKeyID. Rollback by calling s3:DeleteBucketEncryptionCommand with Bucket set to "${bucketName}".`,
            passed: false,
            accountId,
          }),
        ];
      }

      return [
        this.makeFinding({
          id: `s3-encryption-${bucketName}`,
          title: `S3 bucket "${bucketName}" has default encryption enabled`,
          description: `Default server-side encryption is configured.`,
          severity: 'info',
          resourceId: `arn:aws:s3:::${bucketName}`,
          passed: true,
          accountId,
        }),
      ];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes('ServerSideEncryptionConfigurationNotFound') ||
        msg.includes('NoSuchBucket')
      ) {
        return [
          this.makeFinding({
            id: `s3-encryption-${bucketName}`,
            title: `S3 bucket "${bucketName}" has no default encryption`,
            description: `No server-side encryption configuration found for bucket ${bucketName}.`,
            severity: 'high',
            resourceId: `arn:aws:s3:::${bucketName}`,
            remediation: `Use s3:PutBucketEncryptionCommand with Bucket set to "${bucketName}" and ServerSideEncryptionConfiguration.Rules containing a rule with ApplyServerSideEncryptionByDefault.SSEAlgorithm set to 'AES256'. For KMS encryption, set SSEAlgorithm to 'aws:kms' and provide KMSMasterKeyID. Rollback by calling s3:DeleteBucketEncryptionCommand with Bucket set to "${bucketName}".`,
            passed: false,
            accountId,
          }),
        ];
      }
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }
  }

  private async checkVersioning(
    client: S3Client,
    bucketName: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    try {
      const resp = await client.send(
        new GetBucketVersioningCommand({ Bucket: bucketName }),
      );

      if (resp.Status !== 'Enabled') {
        return [
          this.makeFinding({
            id: `s3-versioning-${bucketName}`,
            title: `S3 bucket "${bucketName}" does not have versioning enabled`,
            description: `Bucket ${bucketName} does not have versioning enabled. Without versioning, deleted or overwritten objects cannot be recovered.`,
            severity: 'medium',
            resourceId: `arn:aws:s3:::${bucketName}`,
            remediation: `Use s3:PutBucketVersioningCommand with Bucket set to "${bucketName}" and VersioningConfiguration.Status set to 'Enabled'. Rollback by calling s3:PutBucketVersioningCommand with VersioningConfiguration.Status set to 'Suspended'. Note: versioning cannot be fully disabled once enabled, only suspended.`,
            passed: false,
            accountId,
          }),
        ];
      }

      return [
        this.makeFinding({
          id: `s3-versioning-${bucketName}`,
          title: `S3 bucket "${bucketName}" has versioning enabled`,
          description: `Versioning is enabled for data protection.`,
          severity: 'info',
          resourceId: `arn:aws:s3:::${bucketName}`,
          passed: true,
          accountId,
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
  }): SecurityFinding {
    return {
      id: opts.id,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'AwsS3Bucket',
      resourceId: opts.resourceId || 'unknown',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        service: 'S3',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}

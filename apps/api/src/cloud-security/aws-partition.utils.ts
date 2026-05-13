import type { AwsCredentialIdentity } from '@aws-sdk/types';

export type AwsPartition = 'aws' | 'aws-us-gov';

const AWS_PARTITIONS = new Set<AwsPartition>(['aws', 'aws-us-gov']);

export function normalizeAwsPartition(value: unknown): AwsPartition {
  return typeof value === 'string' && AWS_PARTITIONS.has(value as AwsPartition)
    ? (value as AwsPartition)
    : 'aws';
}

export function getAwsDefaultRegion(partition: AwsPartition): string {
  return partition === 'aws-us-gov' ? 'us-gov-west-1' : 'us-east-1';
}

export function getAwsPartitionForRegion(region: string): AwsPartition {
  return region.startsWith('us-gov-') ? 'aws-us-gov' : 'aws';
}

export function getAwsRoleAssumerEnvName(partition: AwsPartition): string {
  return partition === 'aws-us-gov'
    ? 'SECURITY_HUB_GOVCLOUD_ROLE_ASSUMER_ARN'
    : 'SECURITY_HUB_ROLE_ASSUMER_ARN';
}

export function getAwsRoleAssumerArn(partition: AwsPartition): string | undefined {
  return process.env[getAwsRoleAssumerEnvName(partition)];
}

export function getAwsBaseCredentials(
  partition: AwsPartition,
): AwsCredentialIdentity | undefined {
  if (partition !== 'aws-us-gov') return undefined;

  const accessKeyId = process.env.SECURITY_HUB_GOVCLOUD_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.SECURITY_HUB_GOVCLOUD_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return undefined;

  return {
    accessKeyId,
    secretAccessKey,
  };
}

export function parseAwsRoleArn(
  roleArn: string,
): { partition: AwsPartition; accountId: string } | null {
  const match = roleArn.match(/^arn:(aws|aws-us-gov):iam::(\d{12}):role\/.+$/);
  if (!match) return null;

  return {
    partition: match[1] as AwsPartition,
    accountId: match[2],
  };
}

export function validateAwsPartitionConfig(params: {
  partition: AwsPartition;
  roleArn: string;
  regions: string[];
  remediationRoleArn?: string;
}): string[] {
  const errors: string[] = [];
  const parsedRoleArn = parseAwsRoleArn(params.roleArn);

  if (!parsedRoleArn) {
    errors.push(
      'Invalid IAM Role ARN format. Expected: arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME or arn:aws-us-gov:iam::ACCOUNT_ID:role/ROLE_NAME',
    );
  } else if (parsedRoleArn.partition !== params.partition) {
    errors.push(
      `IAM Role ARN partition (${parsedRoleArn.partition}) must match selected AWS environment (${params.partition}).`,
    );
  }

  if (params.remediationRoleArn) {
    const parsedRemediationArn = parseAwsRoleArn(params.remediationRoleArn);
    if (!parsedRemediationArn) {
      errors.push('Invalid Remediation Role ARN format.');
    } else if (parsedRemediationArn.partition !== params.partition) {
      errors.push(
        `Remediation Role ARN partition (${parsedRemediationArn.partition}) must match selected AWS environment (${params.partition}).`,
      );
    }
  }

  const mismatchedRegions = params.regions.filter(
    (region) => getAwsPartitionForRegion(region) !== params.partition,
  );
  if (mismatchedRegions.length > 0) {
    errors.push(
      `Selected regions do not match ${params.partition}: ${mismatchedRegions.join(', ')}.`,
    );
  }

  return errors;
}

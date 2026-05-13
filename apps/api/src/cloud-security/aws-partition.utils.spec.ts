import {
  getAwsBaseCredentials,
  getAwsDefaultRegion,
  getAwsPartitionForRegion,
  parseAwsRoleArn,
  validateAwsPartitionConfig,
} from './aws-partition.utils';

describe('aws partition utils', () => {
  it('uses GovCloud defaults for the aws-us-gov partition', () => {
    expect(getAwsDefaultRegion('aws')).toBe('us-east-1');
    expect(getAwsDefaultRegion('aws-us-gov')).toBe('us-gov-west-1');
    expect(getAwsPartitionForRegion('us-east-1')).toBe('aws');
    expect(getAwsPartitionForRegion('us-gov-east-1')).toBe('aws-us-gov');
  });

  it('parses commercial and GovCloud role ARNs', () => {
    expect(
      parseAwsRoleArn('arn:aws:iam::123456789012:role/CompAI-Auditor'),
    ).toEqual({ partition: 'aws', accountId: '123456789012' });
    expect(
      parseAwsRoleArn('arn:aws-us-gov:iam::123456789012:role/CompAI-Auditor'),
    ).toEqual({ partition: 'aws-us-gov', accountId: '123456789012' });
  });

  it('rejects mismatched role ARN and region partitions', () => {
    expect(
      validateAwsPartitionConfig({
        partition: 'aws-us-gov',
        roleArn: 'arn:aws:iam::123456789012:role/CompAI-Auditor',
        regions: ['us-gov-west-1', 'us-east-1'],
      }),
    ).toEqual([
      'IAM Role ARN partition (aws) must match selected AWS environment (aws-us-gov).',
      'Selected regions do not match aws-us-gov: us-east-1.',
    ]);
  });

  it('accepts commercial and GovCloud configurations independently', () => {
    expect(
      validateAwsPartitionConfig({
        partition: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/CompAI-Auditor',
        regions: ['us-east-1', 'us-west-2'],
      }),
    ).toEqual([]);

    expect(
      validateAwsPartitionConfig({
        partition: 'aws-us-gov',
        roleArn: 'arn:aws-us-gov:iam::123456789012:role/CompAI-Auditor',
        regions: ['us-gov-west-1', 'us-gov-east-1'],
      }),
    ).toEqual([]);
  });

  it('uses explicit GovCloud base credentials when configured', () => {
    process.env.SECURITY_HUB_GOVCLOUD_ACCESS_KEY_ID = 'AKIAGOV';
    process.env.SECURITY_HUB_GOVCLOUD_SECRET_ACCESS_KEY = 'secret';
    process.env.SECURITY_HUB_GOVCLOUD_SESSION_TOKEN = 'placeholder';

    expect(getAwsBaseCredentials('aws-us-gov')).toEqual({
      accessKeyId: 'AKIAGOV',
      secretAccessKey: 'secret',
    });
    expect(getAwsBaseCredentials('aws')).toBeUndefined();

    delete process.env.SECURITY_HUB_GOVCLOUD_ACCESS_KEY_ID;
    delete process.env.SECURITY_HUB_GOVCLOUD_SECRET_ACCESS_KEY;
    delete process.env.SECURITY_HUB_GOVCLOUD_SESSION_TOKEN;
  });
});

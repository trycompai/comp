import { z } from 'zod';

/**
 * AWS credential fields for the connection form
 */
export const awsCredentialFields = [
  {
    id: 'roleArn',
    label: 'IAM Role ARN',
    type: 'text' as const,
    required: true,
    placeholder: 'arn:aws:iam::123456789012:role/ComplianceAuditRole',
    helpText: 'The ARN of the IAM role you created for Comp to assume',
  },
  {
    id: 'externalId',
    label: 'External ID',
    type: 'text' as const,
    required: true,
    placeholder: 'Use your organization ID (e.g., org_abc123)',
    helpText:
      'A unique identifier you choose. Use the same value here AND in your IAM trust policy. Your organization ID works well for this.',
  },
  {
    id: 'region',
    label: 'Primary AWS Region',
    type: 'combobox' as const,
    required: true,
    placeholder: 'Select or type a region...',
    helpText: 'Select a common region or type your own (e.g., us-east-1, eu-west-1)',
    options: [
      // US Regions
      { value: 'us-east-1', label: 'us-east-1 (N. Virginia)' },
      { value: 'us-east-2', label: 'us-east-2 (Ohio)' },
      { value: 'us-west-1', label: 'us-west-1 (N. California)' },
      { value: 'us-west-2', label: 'us-west-2 (Oregon)' },
      // Europe Regions
      { value: 'eu-west-1', label: 'eu-west-1 (Ireland)' },
      { value: 'eu-west-2', label: 'eu-west-2 (London)' },
      { value: 'eu-west-3', label: 'eu-west-3 (Paris)' },
      { value: 'eu-central-1', label: 'eu-central-1 (Frankfurt)' },
      { value: 'eu-central-2', label: 'eu-central-2 (Zurich)' },
      { value: 'eu-north-1', label: 'eu-north-1 (Stockholm)' },
      { value: 'eu-south-1', label: 'eu-south-1 (Milan)' },
      { value: 'eu-south-2', label: 'eu-south-2 (Spain)' },
      // Asia Pacific Regions
      { value: 'ap-east-1', label: 'ap-east-1 (Hong Kong)' },
      { value: 'ap-south-1', label: 'ap-south-1 (Mumbai)' },
      { value: 'ap-south-2', label: 'ap-south-2 (Hyderabad)' },
      { value: 'ap-northeast-1', label: 'ap-northeast-1 (Tokyo)' },
      { value: 'ap-northeast-2', label: 'ap-northeast-2 (Seoul)' },
      { value: 'ap-northeast-3', label: 'ap-northeast-3 (Osaka)' },
      { value: 'ap-southeast-1', label: 'ap-southeast-1 (Singapore)' },
      { value: 'ap-southeast-2', label: 'ap-southeast-2 (Sydney)' },
      { value: 'ap-southeast-3', label: 'ap-southeast-3 (Jakarta)' },
      { value: 'ap-southeast-4', label: 'ap-southeast-4 (Melbourne)' },
      { value: 'ap-southeast-5', label: 'ap-southeast-5 (Malaysia)' },
      // Canada
      { value: 'ca-central-1', label: 'ca-central-1 (Central)' },
      { value: 'ca-west-1', label: 'ca-west-1 (Calgary)' },
      // South America
      { value: 'sa-east-1', label: 'sa-east-1 (São Paulo)' },
      // Middle East
      { value: 'me-south-1', label: 'me-south-1 (Bahrain)' },
      { value: 'me-central-1', label: 'me-central-1 (UAE)' },
      // Africa
      { value: 'af-south-1', label: 'af-south-1 (Cape Town)' },
      // Israel
      { value: 'il-central-1', label: 'il-central-1 (Tel Aviv)' },
    ],
  },
];

/**
 * Validation schema for AWS credentials
 */
export const awsCredentialSchema = z.object({
  roleArn: z
    .string()
    .regex(
      /^arn:aws:iam::\d{12}:role\/.+$/,
      'Must be a valid IAM Role ARN (arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME)',
    ),
  externalId: z.string().min(1),
  region: z.string().min(1),
});

/**
 * Minimal IAM policy - only what's needed for Security Hub checks
 */
export const awsMinimalPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'SecurityHubReadOnly',
      Effect: 'Allow',
      Action: ['securityhub:GetFindings', 'securityhub:DescribeHub'],
      Resource: '*',
    },
  ],
};

/**
 * Comprehensive IAM policy for additional future compliance checks
 * (Not required if you only want Security Hub findings)
 */
export const awsRecommendedPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'AccessReviewAndRBAC',
      Effect: 'Allow',
      Action: [
        'iam:ListUsers',
        'iam:ListRoles',
        'iam:ListGroups',
        'iam:ListPolicies',
        'iam:GetUser',
        'iam:GetRole',
        'iam:GetGroup',
        'iam:GetPolicy',
        'iam:GetPolicyVersion',
        'iam:ListAttachedUserPolicies',
        'iam:ListAttachedRolePolicies',
        'iam:ListAttachedGroupPolicies',
        'iam:ListUserPolicies',
        'iam:ListRolePolicies',
        'iam:ListGroupPolicies',
        'iam:GetAccountAuthorizationDetails',
        'iam:ListMFADevices',
        'iam:GetLoginProfile',
        'iam:ListAccessKeys',
        'iam:GetAccessKeyLastUsed',
        'cloudtrail:DescribeTrails',
        'cloudtrail:GetTrailStatus',
        'cloudtrail:LookupEvents',
      ],
      Resource: '*',
    },
    {
      Sid: 'MonitoringAndAlerting',
      Effect: 'Allow',
      Action: [
        'cloudwatch:DescribeAlarms',
        'cloudwatch:DescribeAlarmsForMetric',
        'cloudwatch:ListMetrics',
        'sns:ListTopics',
        'sns:ListSubscriptions',
        'sns:GetTopicAttributes',
        'events:ListRules',
        'events:DescribeRule',
        'logs:DescribeLogGroups',
        'logs:DescribeMetricFilters',
      ],
      Resource: '*',
    },
    {
      Sid: 'AutoscalingAndAvailability',
      Effect: 'Allow',
      Action: [
        'autoscaling:DescribeAutoScalingGroups',
        'autoscaling:DescribeLaunchConfigurations',
        'autoscaling:DescribePolicies',
        'elasticloadbalancing:DescribeLoadBalancers',
        'elasticloadbalancing:DescribeTargetGroups',
        'elasticloadbalancing:DescribeTargetHealth',
        'ec2:DescribeInstances',
        'ec2:DescribeAvailabilityZones',
        'ec2:DescribeRegions',
      ],
      Resource: '*',
    },
    {
      Sid: 'EncryptionAtRest',
      Effect: 'Allow',
      Action: [
        's3:ListAllMyBuckets',
        's3:GetBucketEncryption',
        's3:GetBucketPublicAccessBlock',
        'ec2:DescribeVolumes',
        'rds:DescribeDBInstances',
        'rds:DescribeDBClusters',
        'dynamodb:ListTables',
        'dynamodb:DescribeTable',
        'kms:ListKeys',
        'kms:DescribeKey',
        'kms:GetKeyRotationStatus',
      ],
      Resource: '*',
    },
    {
      Sid: 'BackupAndRecovery',
      Effect: 'Allow',
      Action: [
        'backup:ListBackupPlans',
        'backup:GetBackupPlan',
        'backup:ListBackupVaults',
        'backup:ListRecoveryPointsByBackupVault',
        'rds:DescribeDBSnapshots',
        'rds:DescribeDBClusterSnapshots',
        'dynamodb:DescribeContinuousBackups',
        'ec2:DescribeSnapshots',
        's3:GetBucketVersioning',
      ],
      Resource: '*',
    },
  ],
};

/**
 * Setup instructions for AWS IAM Role
 */
export const awsSetupInstructions = `## Quick Setup

### 1. Create IAM Role
IAM Console → Roles → Create role → Custom trust policy

**Trust Policy** (replace YOUR_EXTERNAL_ID with your organization ID):
\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { 
      "AWS": "arn:aws:iam::684120556289:role/roleAssumer"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "YOUR_EXTERNAL_ID" }
    }
  }]
}
\`\`\`

### 2. Attach Permissions
Select **SecurityAudit** managed policy.

### 3. Name the Role
• **Name**: CompSecurityAudit
• **Description**: Read-only access for Comp AI compliance monitoring

### 4. Copy ARN
After creating, copy the Role ARN (looks like \`arn:aws:iam::123456789012:role/CompSecurityAudit\`)
`;

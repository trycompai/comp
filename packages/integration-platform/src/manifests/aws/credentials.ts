import { z } from 'zod';

/**
 * AWS credential fields for the connection form
 */
export const awsCredentialFields = [
  {
    id: 'connectionName',
    label: 'Connection Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Production Account',
    helpText: 'A friendly name to identify this AWS account',
  },
  {
    id: 'roleArn',
    label: 'Role ARN',
    type: 'text' as const,
    required: true,
    placeholder: 'arn:aws:iam::123456789012:role/CompAI-Auditor',
    helpText: 'Paste the Role ARN from the script output above',
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
    id: 'remediationRoleArn',
    label: 'Remediation Role ARN',
    type: 'text' as const,
    required: false,
    placeholder: 'arn:aws:iam::123456789012:role/CompAI-Remediator',
    helpText:
      'Optional: A separate IAM role with write permissions for auto-remediation. The audit role stays read-only.',
  },
  {
    id: 'regions',
    label: 'Regions to scan',
    type: 'multi-select' as const,
    required: true,
    placeholder: 'Select regions...',
    helpText: 'Choose which AWS regions to scan for security findings',
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
  connectionName: z.string().min(1, 'Connection name is required'),
  roleArn: z
    .string()
    .regex(
      /^arn:aws:iam::\d{12}:role\/.+$/,
      'Must be a valid IAM Role ARN (arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME)',
    ),
  externalId: z.string().min(1),
  remediationRoleArn: z
    .string()
    .regex(
      /^arn:aws:iam::\d{12}:role\/.+$/,
      'Must be a valid IAM Role ARN',
    )
    .optional()
    .or(z.literal('')),
  regions: z.array(z.string()).min(1, 'Select at least one region'),
});

/**
 * CloudShell setup script for customers to create the IAM role.
 * Customers run this in AWS CloudShell with their External ID as argument.
 */
export const awsCloudShellScript = [
  '#!/bin/bash',
  'set -euo pipefail',
  '',
  'ROLE_NAME="CompAI-Auditor"',
  'EXTERNAL_ID="YOUR_EXTERNAL_ID"',
  '',
  'echo "Creating IAM role $ROLE_NAME..."',
  '',
  'TRUST_POLICY=$(cat <<EOF',
  '{',
  '  "Version": "2012-10-17",',
  '  "Statement": [{',
  '    "Effect": "Allow",',
  '    "Principal": { "AWS": "arn:aws:iam::684120556289:role/roleAssumer" },',
  '    "Action": "sts:AssumeRole",',
  '    "Condition": { "StringEquals": { "sts:ExternalId": "$EXTERNAL_ID" } }',
  '  }]',
  '}',
  'EOF',
  ')',
  '',
  'ROLE_ARN=$(aws iam create-role \\',
  '  --role-name "$ROLE_NAME" \\',
  '  --max-session-duration 43200 \\',
  '  --assume-role-policy-document "$TRUST_POLICY" \\',
  '  --query "Role.Arn" --output text)',
  '',
  'aws iam attach-role-policy --role-name "$ROLE_NAME" \\',
  '  --policy-arn arn:aws:iam::aws:policy/SecurityAudit',
  '',
  'aws iam attach-role-policy --role-name "$ROLE_NAME" \\',
  '  --policy-arn arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
  '',
  'aws iam put-role-policy --role-name "$ROLE_NAME" \\',
  '  --policy-name CompAI-CostExplorer \\',
  '  --policy-document \'{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"ce:GetCostAndUsage","Resource":"*"}]}\'',
  '',
  'aws iam put-role-policy --role-name "$ROLE_NAME" \\',
  '  --policy-name CompAI-ExtraReadAccess \\',
  '  --policy-document \'{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ssm:GetDocument","ssm:DescribeDocument","ssm:ListDocuments"],"Resource":"*"}]}\'',
  '',
  'echo ""',
  'echo "============================================"',
  'echo "  Role ARN:    $ROLE_ARN"',
  'echo "  External ID: $EXTERNAL_ID"',
  'echo "============================================"',
  'echo ""',
  'echo "Paste these values into your Comp AI connection form."',
].join('\n');

/**
 * CloudShell setup script for the remediation IAM role.
 * Separate from the auditor role so the audit role stays read-only.
 */
export const awsRemediationScript = `# Create Remediation Role for Auto-Fix
# Run this in AWS CloudShell after setting up the Auditor role.

EXTERNAL_ID="YOUR_EXTERNAL_ID"
ROLE_NAME="CompAI-Remediator"

ROLE_ARN=$(aws iam create-role --role-name "$ROLE_NAME" --max-session-duration 3600 \\
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::684120556289:role/roleAssumer"},"Action":"sts:AssumeRole","Condition":{"StringEquals":{"sts:ExternalId":"'$EXTERNAL_ID'"}}}]}' \\
  --query 'Role.Arn' --output text)

# Storage Remediation: S3, DynamoDB, Redshift, Glue, Athena
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-StorageRemediation \\
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:CreateBucket","s3:GetPublicAccessBlock","s3:PutPublicAccessBlock","s3:DeletePublicAccessBlock","s3:GetBucketEncryption","s3:PutBucketEncryption","s3:DeleteBucketEncryption","s3:GetBucketVersioning","s3:PutBucketVersioning","s3:PutBucketPolicy","s3:GetBucketPolicy","s3:DeleteBucketPolicy","dynamodb:DescribeContinuousBackups","dynamodb:UpdateContinuousBackups","dynamodb:DescribeTable","dynamodb:UpdateTable","redshift:DescribeLoggingStatus","redshift:EnableLogging","redshift:DisableLogging","glue:GetDataCatalogEncryptionSettings","glue:PutDataCatalogEncryptionSettings","athena:GetWorkGroup","athena:UpdateWorkGroup"],"Resource":"*"}]}'

# Compute Remediation: EC2, EMR, CodeBuild, Step Functions
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-ComputeRemediation \\
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ec2:GetEbsEncryptionByDefault","ec2:EnableEbsEncryptionByDefault","ec2:DisableEbsEncryptionByDefault","elasticmapreduce:DescribeCluster","elasticmapreduce:SetTerminationProtection","codebuild:BatchGetProjects","codebuild:UpdateProject","states:DescribeStateMachine","states:UpdateStateMachine"],"Resource":"*"}]}'

# Network Remediation: ELB, CloudFront, API Gateway, Route53, Network Firewall, Transfer Family
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-NetworkRemediation \\
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["elasticloadbalancing:DescribeLoadBalancerAttributes","elasticloadbalancing:ModifyLoadBalancerAttributes","cloudfront:GetDistributionConfig","cloudfront:GetDistribution","cloudfront:UpdateDistribution","apigateway:GET","apigateway:PATCH","route53:CreateQueryLoggingConfig","route53:DeleteQueryLoggingConfig","route53:ListQueryLoggingConfigs","network-firewall:DescribeLoggingConfiguration","network-firewall:UpdateLoggingConfiguration","transfer:DescribeServer","transfer:UpdateServer"],"Resource":"*"}]}'

# Security Remediation: KMS, CloudTrail, GuardDuty, Config, Inspector, Macie, Cognito, IAM
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-SecurityRemediation \\
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["kms:GetKeyRotationStatus","kms:EnableKeyRotation","kms:DisableKeyRotation","cloudtrail:GetTrailStatus","cloudtrail:GetTrail","cloudtrail:CreateTrail","cloudtrail:StartLogging","cloudtrail:StopLogging","cloudtrail:UpdateTrail","guardduty:CreateDetector","guardduty:UpdateDetector","guardduty:DeleteDetector","guardduty:ListDetectors","config:DescribeConfigurationRecorders","config:DescribeConfigurationRecorderStatus","config:DescribeDeliveryChannels","config:DescribeDeliveryChannelStatus","config:PutConfigurationRecorder","config:PutDeliveryChannel","config:DeleteDeliveryChannel","config:StartConfigurationRecorder","config:StopConfigurationRecorder","inspector2:Enable","inspector2:Disable","inspector2:BatchGetAccountStatus","macie2:EnableMacie","macie2:DisableMacie","macie2:GetMacieSession","cognito-idp:DescribeUserPool","cognito-idp:UpdateUserPool","iam:GetAccountPasswordPolicy","iam:UpdateAccountPasswordPolicy","iam:DeleteAccountPasswordPolicy","iam:CreateServiceLinkedRole","iam:CreateRole","iam:PutRolePolicy","iam:PassRole","iam:ListRolePolicies","iam:GetRolePolicy","iam:GetRole"],"Resource":"*"}]}'

# Messaging Remediation: SNS, SQS, Kinesis, EventBridge, ECR, Systems Manager, RDS
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-MessagingRemediation \\
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["sns:GetTopicAttributes","sns:SetTopicAttributes","sns:CreateTopic","sns:Subscribe","sqs:GetQueueAttributes","sqs:SetQueueAttributes","sqs:GetQueueUrl","kinesis:DescribeStream","kinesis:StartStreamEncryption","kinesis:StopStreamEncryption","kinesis:EnableEnhancedMonitoring","kinesis:DisableEnhancedMonitoring","events:DescribeEventBus","events:RemovePermission","events:PutPermission","ecr:DescribeRepositories","ecr:PutImageScanningConfiguration","ecr:PutImageTagMutability","ssm:GetServiceSetting","ssm:UpdateServiceSetting","ssm:ResetServiceSetting","ssm:GetDocument","ssm:UpdateDocument","ssm:CreateDocument","ssm:DeleteDocument","ssm:UpdateDocumentDefaultVersion","ssm:DescribeDocument","rds:DescribeDBInstances","rds:ModifyDBInstance"],"Resource":"*"}]}'

# Extended Remediation: Shield, Elastic Beanstalk, Lambda, EKS, CloudWatch, SNS, Backup, OpenSearch, MSK, Secrets Manager, SageMaker, ACM, ElastiCache, EFS, AppFlow, WAF
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-ExtendedRemediation \\
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["shield:CreateSubscription","shield:DescribeSubscription","elasticbeanstalk:UpdateEnvironment","elasticbeanstalk:DescribeConfigurationSettings","elasticbeanstalk:DescribeEnvironments","lambda:GetPolicy","lambda:RemovePermission","lambda:GetFunction","lambda:UpdateFunctionConfiguration","eks:DescribeCluster","eks:UpdateClusterConfig","logs:PutMetricFilter","logs:DeleteMetricFilter","logs:DescribeLogGroups","cloudwatch:PutMetricAlarm","cloudwatch:DeleteAlarms","cloudwatch:DescribeAlarms","sns:CreateTopic","sns:Subscribe","backup:CreateBackupPlan","backup:CreateBackupSelection","backup:DeleteBackupPlan","backup:ListBackupPlans","es:DescribeDomain","es:UpdateDomainConfig","kafka:DescribeCluster","kafka:UpdateMonitoring","secretsmanager:DescribeSecret","secretsmanager:RotateSecret","sagemaker:DescribeNotebookInstance","sagemaker:StopNotebookInstance","sagemaker:UpdateNotebookInstance","sagemaker:StartNotebookInstance","acm:DescribeCertificate","acm:RenewCertificate","elasticache:DescribeReplicationGroups","elasticache:DescribeCacheClusters","efs:DescribeFileSystems","appflow:DescribeFlow","wafv2:GetWebACL","wafv2:UpdateWebACL"],"Resource":"*"}]}'

# Rollback permissions (allows undoing auto-fixes)
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-Rollback \\
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["cloudtrail:DeleteTrail","cloudtrail:StopLogging","s3:DeleteBucket","s3:DeleteBucketPolicy","s3:DeleteBucketEncryption","s3:DeletePublicAccessBlock","iam:DeleteRole","iam:DeleteRolePolicy","logs:DeleteLogGroup","logs:DeleteMetricFilter","logs:DeleteRetentionPolicy","cloudwatch:DeleteAlarms","sns:DeleteTopic","sns:Unsubscribe","guardduty:DeleteDetector","config:StopConfigurationRecorder","config:DeleteDeliveryChannel","inspector2:Disable","macie2:DisableMacie","kms:DisableKeyRotation","ssm:DeleteDocument","ssm:UpdateDocument","ssm:UpdateServiceSetting","ec2:DisableEbsEncryptionByDefault","ec2:DeleteFlowLogs","redshift:DisableLogging","kinesis:StopStreamEncryption","kinesis:DisableEnhancedMonitoring"],"Resource":"*"}]}'

echo ""
echo "============================================"
echo "  Remediation Role ARN (paste this below):"
echo ""
echo "  $ROLE_ARN"
echo ""
echo "============================================"`;

/**
 * Setup instructions for AWS IAM Role
 */
export const awsSetupInstructions = `Setup (AWS CloudShell)

1. Open AWS CloudShell at console.aws.amazon.com/cloudshell
2. Run the following command (replace YOUR_EXTERNAL_ID with your Comp AI organization ID):

EXTERNAL_ID="YOUR_EXTERNAL_ID" && ROLE_NAME="CompAI-Auditor" && aws iam create-role --role-name "$ROLE_NAME" --max-session-duration 43200 --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::684120556289:role/roleAssumer"},"Action":"sts:AssumeRole","Condition":{"StringEquals":{"sts:ExternalId":"'$EXTERNAL_ID'"}}}]}' --query 'Role.Arn' --output text && aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/SecurityAudit && aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/job-function/ViewOnlyAccess && aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-CostExplorer --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"ce:GetCostAndUsage","Resource":"*"}]}' && aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name CompAI-ExtraReadAccess --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ssm:GetDocument","ssm:DescribeDocument","ssm:ListDocuments"],"Resource":"*"}]}'

3. Copy the Role ARN from the output
4. Paste the Role ARN and External ID into the form below`;

import type { IntegrationManifest } from '../../types';
import { awsCredentialFields, awsCredentialSchema, awsSetupInstructions, awsCloudShellScript } from './credentials';

export const awsManifest: IntegrationManifest = {
  id: 'aws',
  name: 'Amazon Web Services',
  description: 'Monitor security configurations and compliance across your AWS infrastructure',
  category: 'Cloud',
  logoUrl: 'https://img.logo.dev/aws.amazon.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl:
    'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html',
  supportsMultipleConnections: true,
  isActive: true,

  auth: {
    type: 'custom',
    config: {
      description: 'AWS IAM Role Assumption - secure cross-account access',
      credentialFields: awsCredentialFields,
      validationSchema: awsCredentialSchema,
      setupInstructions: awsSetupInstructions,
      setupScript: awsCloudShellScript,
    },
  },

  baseUrl: '',

  capabilities: ['checks'],

  services: [
    // Implemented
    { id: 'security-hub', name: 'Security Hub', description: 'Centralized security findings aggregation and compliance checks', enabledByDefault: false, implemented: true },
    { id: 'iam-analyzer', name: 'IAM Access Analyzer', description: 'IAM password policy, MFA enforcement, and access key rotation checks', enabledByDefault: false, implemented: true },
    { id: 'cloudtrail', name: 'CloudTrail', description: 'Audit log monitoring, multi-region trail, and log validation checks', enabledByDefault: false, implemented: true },
    { id: 's3', name: 'S3 Bucket Security', description: 'Public access blocks, default encryption, and versioning checks', enabledByDefault: false, implemented: true },
    { id: 'ec2-vpc', name: 'EC2 & VPC Security', description: 'Security group rules, EBS encryption, and VPC flow log checks', enabledByDefault: false, implemented: true },
    { id: 'rds', name: 'RDS Security', description: 'Public accessibility, encryption, backup retention, and deletion protection checks', enabledByDefault: false, implemented: true },
    { id: 'kms', name: 'KMS', description: 'Encryption key rotation monitoring for customer-managed keys', enabledByDefault: false, implemented: true },
    // High priority — required by SOC 2 / ISO 27001 / CIS
    { id: 'cloudwatch', name: 'CloudWatch', description: 'CIS metric alarms for root login, unauthorized API calls, and security group changes', enabledByDefault: false, implemented: true },
    { id: 'config', name: 'AWS Config', description: 'Resource configuration compliance and change tracking', enabledByDefault: false, implemented: true },
    { id: 'guardduty', name: 'GuardDuty', description: 'Intelligent threat detection and continuous monitoring', enabledByDefault: false, implemented: true },
    { id: 'secrets-manager', name: 'Secrets Manager', description: 'Secret rotation policies and unused secret detection', enabledByDefault: false, implemented: true },
    { id: 'waf', name: 'WAF', description: 'Web ACL rules, rate limiting, and resource association checks', enabledByDefault: false, implemented: true },
    { id: 'elb', name: 'ELB / ALB', description: 'SSL/TLS policy compliance, access logging, and WAF association checks', enabledByDefault: false, implemented: true },
    { id: 'acm', name: 'ACM', description: 'Certificate expiry monitoring and renewal validation', enabledByDefault: false, implemented: true },
    { id: 'backup', name: 'AWS Backup', description: 'Backup plan coverage and cross-region backup validation', enabledByDefault: false, implemented: true },
    // Medium priority — important for infrastructure security
    { id: 'inspector', name: 'Inspector', description: 'Automated vulnerability management for EC2, Lambda, and ECR', enabledByDefault: false, implemented: true },
    { id: 'ecs-eks', name: 'ECS & EKS', description: 'Container security, privileged mode detection, and cluster logging checks', enabledByDefault: false, implemented: true },
    { id: 'lambda', name: 'Lambda', description: 'Outdated runtimes, public function policies, and VPC attachment checks', enabledByDefault: false, implemented: true },
    { id: 'dynamodb', name: 'DynamoDB', description: 'Encryption at rest, point-in-time recovery, and backup checks', enabledByDefault: false, implemented: true },
    { id: 'sns-sqs', name: 'SNS & SQS', description: 'Public topic/queue policies and encryption at rest checks', enabledByDefault: false, implemented: true },
    { id: 'ecr', name: 'ECR', description: 'Image scanning configuration and immutable tag enforcement', enabledByDefault: false, implemented: true },
    { id: 'opensearch', name: 'OpenSearch', description: 'Domain encryption, VPC deployment, and fine-grained access control checks', enabledByDefault: false, implemented: true },
    // Lower priority — specialized use cases
    { id: 'redshift', name: 'Redshift', description: 'Cluster encryption, public accessibility, and audit logging checks', enabledByDefault: false, implemented: true },
    { id: 'macie', name: 'Macie', description: 'Sensitive data discovery and data protection monitoring', enabledByDefault: false, implemented: true },
    { id: 'route53', name: 'Route 53', description: 'DNSSEC configuration and query logging checks', enabledByDefault: false, implemented: true },
    // Additional services
    { id: 'api-gateway', name: 'API Gateway', description: 'Authorization, WAF association, access logging, and TLS version checks', enabledByDefault: false, implemented: true },
    { id: 'cloudfront', name: 'CloudFront', description: 'HTTPS enforcement, WAF association, geo-restrictions, and access logging checks', enabledByDefault: false, implemented: true },
    { id: 'cognito', name: 'Cognito', description: 'User pool MFA enforcement, password policy, and advanced security checks', enabledByDefault: false, implemented: true },
    { id: 'elasticache', name: 'ElastiCache', description: 'Encryption in transit and at rest, auth token, and VPC deployment checks', enabledByDefault: false, implemented: true },
    { id: 'efs', name: 'EFS', description: 'Encryption at rest, access point policies, and lifecycle management checks', enabledByDefault: false, implemented: true },
    { id: 'msk', name: 'MSK', description: 'Cluster encryption, authentication, and broker logging checks', enabledByDefault: false, implemented: true },
    { id: 'sagemaker', name: 'SageMaker', description: 'Notebook encryption, VPC configuration, and root access restriction checks', enabledByDefault: false, implemented: true },
    { id: 'systems-manager', name: 'Systems Manager', description: 'Parameter Store encryption, Session Manager logging, and patch compliance checks', enabledByDefault: false, implemented: true },
    { id: 'codebuild', name: 'CodeBuild', description: 'Build project encryption, privileged mode, and logging configuration checks', enabledByDefault: false, implemented: true },
    { id: 'network-firewall', name: 'Network Firewall', description: 'Firewall policy enforcement, stateful rule groups, and logging checks', enabledByDefault: false, implemented: true },
    { id: 'shield', name: 'Shield', description: 'DDoS protection status and advanced Shield subscription checks', enabledByDefault: false, implemented: true },
    { id: 'kinesis', name: 'Kinesis', description: 'Stream encryption at rest and enhanced monitoring checks', enabledByDefault: false, implemented: true },
    { id: 'glue', name: 'Glue', description: 'Job encryption, connection SSL, and data catalog security checks', enabledByDefault: false, implemented: true },
    { id: 'athena', name: 'Athena', description: 'Query result encryption and workgroup enforcement checks', enabledByDefault: false, implemented: true },
    { id: 'emr', name: 'EMR', description: 'Cluster encryption, security configuration, and logging checks', enabledByDefault: false, implemented: true },
    { id: 'step-functions', name: 'Step Functions', description: 'State machine logging and execution history encryption checks', enabledByDefault: false, implemented: true },
    { id: 'eventbridge', name: 'EventBridge', description: 'Event bus policies, cross-account access, and encryption checks', enabledByDefault: false, implemented: true },
    { id: 'transfer-family', name: 'Transfer Family', description: 'SFTP/FTPS server protocol enforcement and logging checks', enabledByDefault: false, implemented: true },
    { id: 'elastic-beanstalk', name: 'Elastic Beanstalk', description: 'Managed updates, enhanced health reporting, and HTTPS configuration checks', enabledByDefault: false, implemented: true },
    { id: 'appflow', name: 'AppFlow', description: 'Flow encryption, VPC configuration, and data transfer security checks', enabledByDefault: false, implemented: true },
  ],

  checks: [],
};

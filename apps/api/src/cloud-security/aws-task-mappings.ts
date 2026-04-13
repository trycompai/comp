/**
 * Maps AWS service adapter IDs to framework task template IDs.
 *
 * When ALL findings for a service pass, the linked evidence tasks
 * are auto-satisfied with scan results as proof.
 *
 * Only pass → done. Never mark tasks as failed from scan data.
 */
export const AWS_SERVICE_TASK_MAPPINGS: Record<string, string[]> = {
  // IAM → Employee Access, RBAC, Access Review Log
  'iam-analyzer': [
    'frk_tt_68406ca292d9fffb264991b9',
    'frk_tt_68e80544d9734e0402cfa807',
    'frk_tt_68e805457c2dcc784e72e3cc',
  ],
  // KMS, S3, RDS, DynamoDB → Encryption at Rest
  kms: ['frk_tt_68e52b26bf0e656af9e4e9c3'],
  s3: ['frk_tt_68e52b26bf0e656af9e4e9c3'],
  rds: [
    'frk_tt_68e52b26bf0e656af9e4e9c3',
    'frk_tt_68e52b26b166e2c0a0d11956',
  ],
  // CloudTrail, CloudWatch → Monitoring & Alerting
  cloudtrail: ['frk_tt_68406af04a4acb93083413b9'],
  cloudwatch: ['frk_tt_68406af04a4acb93083413b9'],
  // GuardDuty → Incident Response
  guardduty: ['frk_tt_68406b4f40c87c12ae0479ce'],
  // Secrets Manager → Secure Secrets
  'secrets-manager': ['frk_tt_68407ae5274a64092c305104'],
  // ELB, ACM, CloudFront → TLS / HTTPS
  elb: ['frk_tt_68406f411fe27e47a0d6d5f3'],
  acm: ['frk_tt_68406f411fe27e47a0d6d5f3'],
  cloudfront: ['frk_tt_68406f411fe27e47a0d6d5f3'],
  // EC2/VPC, WAF, Network Firewall → Production Firewall
  'ec2-vpc': [
    'frk_tt_68fa2a852e70f757188f0c39',
    'frk_tt_68406af04a4acb93083413b9',
  ],
  waf: ['frk_tt_68fa2a852e70f757188f0c39'],
  'network-firewall': ['frk_tt_68fa2a852e70f757188f0c39'],
  // Shield → App Availability
  shield: ['frk_tt_68406d2e86acc048d1774ea6'],
  // Backup, RDS, DynamoDB → Backup logs
  backup: ['frk_tt_68e52b26b166e2c0a0d11956'],
  dynamodb: [
    'frk_tt_68e52b26bf0e656af9e4e9c3',
    'frk_tt_68e52b26b166e2c0a0d11956',
  ],
  // Config, Inspector → Internal Security Audit
  config: ['frk_tt_68e52b2618cb9d9722c6edfd'],
  inspector: ['frk_tt_68e52b2618cb9d9722c6edfd'],
  // Lambda → Secure Code
  lambda: ['frk_tt_68406e353df3bc002994acef'],
  // ECS/EKS → Separation of Environments, Monitoring
  'ecs-eks': [
    'frk_tt_68e52a484cad0014de7a628f',
    'frk_tt_68406af04a4acb93083413b9',
  ],
  // Cognito → Employee Access
  cognito: ['frk_tt_68406ca292d9fffb264991b9'],
};

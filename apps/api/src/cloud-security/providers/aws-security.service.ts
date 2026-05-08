import { Injectable, Logger } from '@nestjs/common';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from '@aws-sdk/client-cost-explorer';
import type { SecurityFinding } from '../cloud-security.service';
import type {
  AwsCredentials,
  AwsServiceAdapter,
} from './aws/aws-service-adapter';
import { IamAdapter } from './aws/iam.adapter';
import { CloudTrailAdapter } from './aws/cloudtrail.adapter';
import { S3Adapter } from './aws/s3.adapter';
import { Ec2VpcAdapter } from './aws/ec2-vpc.adapter';
import { RdsAdapter } from './aws/rds.adapter';
import { KmsAdapter } from './aws/kms.adapter';
import { CloudWatchAdapter } from './aws/cloudwatch.adapter';
import { ConfigAdapter } from './aws/config.adapter';
import { GuardDutyAdapter } from './aws/guardduty.adapter';
import { SecretsManagerAdapter } from './aws/secrets-manager.adapter';
import { WafAdapter } from './aws/waf.adapter';
import { ElbAdapter } from './aws/elb.adapter';
import { AcmAdapter } from './aws/acm.adapter';
import { BackupAdapter } from './aws/backup.adapter';
import { InspectorAdapter } from './aws/inspector.adapter';
import { EcsEksAdapter } from './aws/ecs-eks.adapter';
import { LambdaAdapter } from './aws/lambda.adapter';
import { DynamoDbAdapter } from './aws/dynamodb.adapter';
import { SnsSqsAdapter } from './aws/sns-sqs.adapter';
import { EcrAdapter } from './aws/ecr.adapter';
import { OpenSearchAdapter } from './aws/opensearch.adapter';
import { RedshiftAdapter } from './aws/redshift.adapter';
import { MacieAdapter } from './aws/macie.adapter';
import { Route53Adapter } from './aws/route53.adapter';
import { ApiGatewayAdapter } from './aws/api-gateway.adapter';
import { CloudFrontAdapter } from './aws/cloudfront.adapter';
import { CognitoAdapter } from './aws/cognito.adapter';
import { ElastiCacheAdapter } from './aws/elasticache.adapter';
import { EfsAdapter } from './aws/efs.adapter';
import { MskAdapter } from './aws/msk.adapter';
import { SageMakerAdapter } from './aws/sagemaker.adapter';
import { SystemsManagerAdapter } from './aws/systems-manager.adapter';
import { CodeBuildAdapter } from './aws/codebuild.adapter';
import { NetworkFirewallAdapter } from './aws/network-firewall.adapter';
import { ShieldAdapter } from './aws/shield.adapter';
import { KinesisAdapter } from './aws/kinesis.adapter';
import { GlueAdapter } from './aws/glue.adapter';
import { AthenaAdapter } from './aws/athena.adapter';
import { EmrAdapter } from './aws/emr.adapter';
import { StepFunctionsAdapter } from './aws/step-functions.adapter';
import { EventBridgeAdapter } from './aws/eventbridge.adapter';
import { TransferFamilyAdapter } from './aws/transfer-family.adapter';
import { ElasticBeanstalkAdapter } from './aws/elastic-beanstalk.adapter';
import { AppFlowAdapter } from './aws/appflow.adapter';

@Injectable()
export class AWSSecurityService {
  private readonly logger = new Logger(AWSSecurityService.name);

  private readonly adapters: AwsServiceAdapter[] = [
    new IamAdapter(),
    new CloudTrailAdapter(),
    new S3Adapter(),
    new Ec2VpcAdapter(),
    new RdsAdapter(),
    new KmsAdapter(),
    new CloudWatchAdapter(),
    new ConfigAdapter(),
    new GuardDutyAdapter(),
    new SecretsManagerAdapter(),
    new WafAdapter(),
    new ElbAdapter(),
    new AcmAdapter(),
    new BackupAdapter(),
    new InspectorAdapter(),
    new EcsEksAdapter(),
    new LambdaAdapter(),
    new DynamoDbAdapter(),
    new SnsSqsAdapter(),
    new EcrAdapter(),
    new OpenSearchAdapter(),
    new RedshiftAdapter(),
    new MacieAdapter(),
    new Route53Adapter(),
    new ApiGatewayAdapter(),
    new CloudFrontAdapter(),
    new CognitoAdapter(),
    new ElastiCacheAdapter(),
    new EfsAdapter(),
    new MskAdapter(),
    new SageMakerAdapter(),
    new SystemsManagerAdapter(),
    new CodeBuildAdapter(),
    new NetworkFirewallAdapter(),
    new ShieldAdapter(),
    new KinesisAdapter(),
    new GlueAdapter(),
    new AthenaAdapter(),
    new EmrAdapter(),
    new StepFunctionsAdapter(),
    new EventBridgeAdapter(),
    new TransferFamilyAdapter(),
    new ElasticBeanstalkAdapter(),
    new AppFlowAdapter(),
  ];

  async scanSecurityFindings(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
    enabledServices?: string[],
  ): Promise<SecurityFinding[]> {
    const isRoleAuth = Boolean(credentials.roleArn && credentials.externalId);
    const isKeyAuth = Boolean(
      credentials.access_key_id && credentials.secret_access_key,
    );

    if (!isRoleAuth && !isKeyAuth) {
      throw new Error(
        'AWS credentials missing. Provide IAM Role or Access Keys.',
      );
    }

    const configuredRegions = this.getConfiguredRegions(credentials, variables);
    const primaryRegion = configuredRegions[0];

    this.logger.log(
      `Scanning ${configuredRegions.length} region(s): ${configuredRegions.join(', ')}`,
    );

    // Assume role ONCE — IAM is global, credentials work across all regions
    let awsCredentials: AwsCredentials;
    if (isRoleAuth) {
      awsCredentials = await this.assumeRole({
        roleArn: credentials.roleArn as string,
        externalId: credentials.externalId as string,
        region: primaryRegion,
      });
    } else {
      awsCredentials = {
        accessKeyId: credentials.access_key_id as string,
        secretAccessKey: credentials.secret_access_key as string,
      };
    }

    // undefined = scan all (no detection data), [] = scan nothing (all disabled), [...] = scan specific
    const activeAdapters =
      enabledServices === undefined
        ? this.adapters
        : this.adapters.filter((a) => enabledServices.includes(a.serviceId));

    this.logger.log(
      `Scanning ${activeAdapters.length} service adapters` +
        (enabledServices?.length
          ? ` (filtered from ${this.adapters.length} total)`
          : ''),
    );

    const allFindings: SecurityFinding[] = [];
    const successfulRegions = new Set<string>();
    const failedRegions = new Set<string>();

    // Run global adapters once in the primary region
    const globalAdapters = activeAdapters.filter((a) => a.isGlobal);
    for (const adapter of globalAdapters) {
      try {
        const findings = await adapter.scan({
          credentials: awsCredentials,
          region: primaryRegion,
        });
        for (const f of findings) {
          f.evidence = { ...f.evidence, serviceId: adapter.serviceId };
        }
        allFindings.push(...findings);
        this.logger.log(
          `[${adapter.serviceId}] ${findings.length} findings (global)`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[${adapter.serviceId}] Error (global): ${msg}`);
      }
    }

    // Run regional adapters per configured region
    const regionalAdapters = activeAdapters.filter((a) => !a.isGlobal);
    for (const region of configuredRegions) {
      for (const adapter of regionalAdapters) {
        try {
          const findings = await adapter.scan({
            credentials: awsCredentials,
            region,
          });
          for (const f of findings) {
            f.evidence = { ...f.evidence, serviceId: adapter.serviceId };
          }
          allFindings.push(...findings);
          successfulRegions.add(region);
          this.logger.log(
            `[${adapter.serviceId}] ${findings.length} findings in ${region}`,
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`[${adapter.serviceId}] Error in ${region}: ${msg}`);
          failedRegions.add(region);
        }
      }
    }

    this.logger.log(
      `Scan complete: ${allFindings.length} findings from ${successfulRegions.size} regions`,
    );

    // If ALL regions failed for regional adapters and no global adapters succeeded
    if (
      regionalAdapters.length > 0 &&
      successfulRegions.size === 0 &&
      failedRegions.size > 0
    ) {
      throw new Error(
        `All ${failedRegions.size} region(s) failed to scan: ${[...failedRegions].join(', ')}`,
      );
    }

    return allFindings;
  }

  /**
   * Get the list of regions to scan from credentials or variables.
   * Always returns at least one region (defaults to us-east-1).
   */
  private getConfiguredRegions(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
  ): string[] {
    if (Array.isArray(credentials.regions) && credentials.regions.length > 0) {
      const filtered = credentials.regions.filter(
        (r): r is string => typeof r === 'string' && r.trim().length > 0,
      );
      if (filtered.length > 0) return filtered;
    }

    if (Array.isArray(variables.regions) && variables.regions.length > 0) {
      const filtered = variables.regions.filter(
        (r): r is string => typeof r === 'string' && r.trim().length > 0,
      );
      if (filtered.length > 0) return filtered;
    }

    const singleRegion =
      (credentials.region as string) || (variables.region as string);

    if (
      singleRegion &&
      typeof singleRegion === 'string' &&
      singleRegion.trim()
    ) {
      return [singleRegion.trim()];
    }

    return ['us-east-1'];
  }

  /**
   * Assume the remediation IAM role for write access.
   * Uses a separate role ARN so the audit role stays read-only.
   */
  async assumeRemediationRole(
    credentials: Record<string, unknown>,
    region: string,
  ): Promise<AwsCredentials> {
    const remediationRoleArn = credentials.remediationRoleArn as
      | string
      | undefined;
    if (!remediationRoleArn) {
      throw new Error(
        'Remediation role ARN not configured. Add a Remediation Role ARN to your AWS connection.',
      );
    }

    return this.assumeRole({
      roleArn: remediationRoleArn,
      externalId: credentials.externalId as string,
      region,
      sessionName: 'CompSecurityRemediation',
    });
  }

  /**
   * Assume IAM role for cross-account access (two-hop)
   */
  async assumeRole(params: {
    roleArn: string;
    externalId: string;
    region: string;
    sessionName?: string;
  }): Promise<AwsCredentials> {
    const { roleArn, externalId, region, sessionName } = params;

    const roleAssumerArn = process.env.SECURITY_HUB_ROLE_ASSUMER_ARN;
    if (!roleAssumerArn) {
      throw new Error(
        'Missing SECURITY_HUB_ROLE_ASSUMER_ARN (our roleAssumer ARN).',
      );
    }

    // Hop 1: task role -> roleAssumer
    const baseSts = new STSClient({ region });
    const roleAssumerResp = await baseSts.send(
      new AssumeRoleCommand({
        RoleArn: roleAssumerArn,
        RoleSessionName: 'CompRoleAssumer',
        DurationSeconds: 3600,
      }),
    );

    const roleAssumerCreds = roleAssumerResp.Credentials;
    if (!roleAssumerCreds?.AccessKeyId || !roleAssumerCreds.SecretAccessKey) {
      throw new Error('Failed to assume roleAssumer - no credentials returned');
    }

    const roleAssumerAwsCreds: AwsCredentials = {
      accessKeyId: roleAssumerCreds.AccessKeyId,
      secretAccessKey: roleAssumerCreds.SecretAccessKey,
      sessionToken: roleAssumerCreds.SessionToken,
    };

    // Hop 2: roleAssumer -> customer role
    const roleAssumerSts = new STSClient({
      region,
      credentials: roleAssumerAwsCreds,
    });

    this.logger.log(`Assuming customer role ${roleArn} in region ${region}`);

    const customerResp = await roleAssumerSts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        ExternalId: externalId,
        RoleSessionName: sessionName ?? 'CompSecurityAudit',
        DurationSeconds: 3600,
      }),
    );

    const customerCreds = customerResp.Credentials;
    if (!customerCreds?.AccessKeyId || !customerCreds.SecretAccessKey) {
      throw new Error(
        'Failed to assume customer role - no credentials returned',
      );
    }

    return {
      accessKeyId: customerCreds.AccessKeyId,
      secretAccessKey: customerCreds.SecretAccessKey,
      sessionToken: customerCreds.SessionToken,
    };
  }

  /**
   * Detect which AWS services are actively used via Cost Explorer billing data.
   * Returns serviceIds matching our adapter IDs (e.g. 's3', 'rds', 'lambda').
   */
  async detectActiveServices(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
  ): Promise<string[]> {
    const configuredRegions = this.getConfiguredRegions(credentials, variables);
    const primaryRegion = configuredRegions[0];

    const isRoleAuth = Boolean(credentials.roleArn && credentials.externalId);
    const isKeyAuth = Boolean(
      credentials.access_key_id && credentials.secret_access_key,
    );

    if (!isRoleAuth && !isKeyAuth) {
      throw new Error('AWS credentials missing');
    }

    let awsCredentials: AwsCredentials;
    if (isRoleAuth) {
      awsCredentials = await this.assumeRole({
        roleArn: credentials.roleArn as string,
        externalId: credentials.externalId as string,
        region: primaryRegion,
      });
    } else {
      awsCredentials = {
        accessKeyId: credentials.access_key_id as string,
        secretAccessKey: credentials.secret_access_key as string,
      };
    }

    const client = new CostExplorerClient({
      region: 'us-east-1', // Cost Explorer is global, always use us-east-1
      credentials: awsCredentials,
    });

    const now = new Date();
    const end = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    let response;
    try {
      response = await client.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: start, End: end },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
        }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Cost Explorer unavailable (missing ce:GetCostAndUsage permission?): ${msg}`,
      );
      return [];
    }

    const activeAwsNames = new Set<string>();
    for (const result of response.ResultsByTime ?? []) {
      for (const group of result.Groups ?? []) {
        const serviceName = group.Keys?.[0];
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0');
        if (serviceName && amount > 0) {
          activeAwsNames.add(serviceName);
        }
      }
    }

    // Map AWS billing service names to our adapter serviceIds
    const detected: string[] = [];
    for (const [awsName, serviceIds] of Object.entries(
      AWS_COST_SERVICE_MAPPING,
    )) {
      if (activeAwsNames.has(awsName)) {
        for (const id of serviceIds) {
          if (!detected.includes(id)) {
            detected.push(id);
          }
        }
      }
    }

    this.logger.log(
      `Cost Explorer detected ${detected.length} active services from ${activeAwsNames.size} billing entries`,
    );

    return detected;
  }
}

/**
 * Maps AWS Cost Explorer billing service names to our adapter serviceIds.
 * One billing name may map to multiple adapters (e.g. EC2 → ec2-vpc, elb).
 */
const AWS_COST_SERVICE_MAPPING: Record<string, string[]> = {
  'AWS Security Hub': ['security-hub'],
  'AWS IAM Access Analyzer': ['iam-analyzer'],
  'AWS CloudTrail': ['cloudtrail'],
  'Amazon Simple Storage Service': ['s3'],
  'Amazon Elastic Compute Cloud - Compute': ['ec2-vpc'],
  'EC2 - Other': ['ec2-vpc'],
  'Amazon Relational Database Service': ['rds'],
  'AWS Key Management Service': ['kms'],
  'Amazon CloudWatch': ['cloudwatch'],
  'AWS Config': ['config'],
  'Amazon GuardDuty': ['guardduty'],
  'AWS Secrets Manager': ['secrets-manager'],
  'AWS WAF': ['waf'],
  'Amazon Elastic Load Balancing': ['elb'],
  'AWS Certificate Manager': ['acm'],
  'AWS Backup': ['backup'],
  'Amazon Inspector': ['inspector'],
  'Amazon Elastic Container Service': ['ecs-eks'],
  'Amazon Elastic Kubernetes Service': ['ecs-eks'],
  'AWS Lambda': ['lambda'],
  'Amazon DynamoDB': ['dynamodb'],
  'Amazon Simple Notification Service': ['sns-sqs'],
  'Amazon Simple Queue Service': ['sns-sqs'],
  'Amazon Elastic Container Registry': ['ecr'],
  'Amazon OpenSearch Service': ['opensearch'],
  'Amazon Elasticsearch Service': ['opensearch'], // legacy name
  'Amazon Redshift': ['redshift'],
  'Amazon Macie': ['macie'],
  'Amazon Route 53': ['route53'],
  'Amazon API Gateway': ['api-gateway'],
  'Amazon CloudFront': ['cloudfront'],
  'Amazon Cognito': ['cognito'],
  'Amazon ElastiCache': ['elasticache'],
  'Amazon Elastic File System': ['efs'],
  'Amazon Managed Streaming for Apache Kafka': ['msk'],
  'Amazon SageMaker': ['sagemaker'],
  'AWS Systems Manager': ['systems-manager'],
  'AWS CodeBuild': ['codebuild'],
  'AWS Network Firewall': ['network-firewall'],
  'AWS Shield': ['shield'],
  'Amazon Kinesis': ['kinesis'],
  'Amazon Kinesis Data Firehose': ['kinesis'],
  'Amazon Kinesis Data Analytics': ['kinesis'],
  'AWS Glue': ['glue'],
  'Amazon Athena': ['athena'],
  'Amazon Elastic MapReduce': ['emr'],
  'AWS Step Functions': ['step-functions'],
  'Amazon EventBridge': ['eventbridge'],
  'AWS Transfer Family': ['transfer-family'],
  'AWS Elastic Beanstalk': ['elastic-beanstalk'],
  'Amazon AppFlow': ['appflow'],
};

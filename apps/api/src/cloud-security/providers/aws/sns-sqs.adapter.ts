import {
  SNSClient,
  ListTopicsCommand,
  GetTopicAttributesCommand,
} from '@aws-sdk/client-sns';
import {
  SQSClient,
  ListQueuesCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

function isPublicPolicy(policyJson: string): boolean {
  try {
    const policy = JSON.parse(policyJson);
    const statements = policy.Statement ?? [];

    return statements.some((stmt: Record<string, unknown>) => {
      if (stmt.Effect !== 'Allow') return false;
      if (stmt.Condition && Object.keys(stmt.Condition).length > 0)
        return false;
      const principal = stmt.Principal;
      if (principal === '*') return true;
      if (
        typeof principal === 'object' &&
        principal !== null &&
        (principal as Record<string, unknown>).AWS === '*'
      )
        return true;
      return false;
    });
  } catch {
    return false;
  }
}

export class SnsSqsAdapter implements AwsServiceAdapter {
  readonly serviceId = 'sns-sqs';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      await this.scanSns({ credentials, region, findings });
      await this.scanSqs({ credentials, region, findings });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private async scanSns({
    credentials,
    region,
    findings,
  }: {
    credentials: AwsCredentials;
    region: string;
    findings: SecurityFinding[];
  }): Promise<void> {
    const client = new SNSClient({ credentials, region });
    let nextToken: string | undefined;

    do {
      const resp = await client.send(
        new ListTopicsCommand({ NextToken: nextToken }),
      );

      const topics = resp.Topics ?? [];

      for (const topic of topics) {
        const arn = topic.TopicArn ?? 'unknown';

        try {
          const attrsResp = await client.send(
            new GetTopicAttributesCommand({ TopicArn: arn }),
          );
          const attrs = attrsResp.Attributes ?? {};

          // Check for public access
          if (attrs.Policy && isPublicPolicy(attrs.Policy)) {
            findings.push(
              this.makeFinding({
                resourceId: arn,
                resourceType: 'AwsSnsTopic',
                title: 'SNS topic is publicly accessible',
                description: `SNS topic ${arn} has a resource policy that allows public access without conditions.`,
                severity: 'high',
                remediation:
                  "Use sns:SetTopicAttributesCommand with TopicArn and AttributeName 'Policy' to restrict access. Set the policy to deny public access while allowing the topic owner. Rollback by restoring the previous policy.",
                evidence: { policy: JSON.parse(attrs.Policy).Statement },
              }),
            );
          }

          // Check for KMS encryption
          if (!attrs.KmsMasterKeyId) {
            findings.push(
              this.makeFinding({
                resourceId: arn,
                resourceType: 'AwsSnsTopic',
                title: 'SNS topic not encrypted with KMS',
                description: `SNS topic ${arn} does not use KMS encryption for messages at rest.`,
                severity: 'medium',
                remediation:
                  "Use sns:SetTopicAttributesCommand with TopicArn and AttributeName 'KmsMasterKeyId' set to 'alias/aws/sns'. Rollback by calling sns:SetTopicAttributesCommand with AttributeName 'KmsMasterKeyId' set to empty string.",
                evidence: { kmsMasterKeyId: null },
              }),
            );
          }
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          if (msg.includes('AccessDenied')) return;
        }
      }

      nextToken = resp.NextToken;
    } while (nextToken);
  }

  private async scanSqs({
    credentials,
    region,
    findings,
  }: {
    credentials: AwsCredentials;
    region: string;
    findings: SecurityFinding[];
  }): Promise<void> {
    const client = new SQSClient({ credentials, region });
    let nextToken: string | undefined;

    do {
      const resp = await client.send(
        new ListQueuesCommand({ NextToken: nextToken }),
      );

      const queueUrls = resp.QueueUrls ?? [];

      for (const queueUrl of queueUrls) {
        try {
          const attrsResp = await client.send(
            new GetQueueAttributesCommand({
              QueueUrl: queueUrl,
              AttributeNames: ['Policy', 'KmsMasterKeyId', 'SqsManagedSseEnabled'],
            }),
          );
          const attrs = attrsResp.Attributes ?? {};

          // Check for public access
          if (attrs.Policy && isPublicPolicy(attrs.Policy)) {
            findings.push(
              this.makeFinding({
                resourceId: queueUrl,
                resourceType: 'AwsSqsQueue',
                title: 'SQS queue is publicly accessible',
                description: `SQS queue ${queueUrl} has a resource policy that allows public access without conditions.`,
                severity: 'high',
                remediation:
                  "Use sqs:SetQueueAttributesCommand with QueueUrl and Attributes.Policy to restrict access. Remove the statement that allows '*' principal. Rollback by restoring the previous policy.",
                evidence: { policy: JSON.parse(attrs.Policy).Statement },
              }),
            );
          }

          // Check for encryption
          if (
            !attrs.KmsMasterKeyId &&
            attrs.SqsManagedSseEnabled !== 'true'
          ) {
            findings.push(
              this.makeFinding({
                resourceId: queueUrl,
                resourceType: 'AwsSqsQueue',
                title: 'SQS queue not encrypted',
                description: `SQS queue ${queueUrl} does not have KMS or SQS-managed server-side encryption enabled.`,
                severity: 'medium',
                remediation:
                  "Use sqs:SetQueueAttributesCommand with Attributes.KmsMasterKeyId set to 'alias/aws/sqs' for SQS. Rollback by removing the KmsMasterKeyId attribute.",
                evidence: {
                  kmsMasterKeyId: attrs.KmsMasterKeyId ?? null,
                  sqsManagedSseEnabled: attrs.SqsManagedSseEnabled ?? null,
                },
              }),
            );
          }
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          if (msg.includes('AccessDenied')) return;
        }
      }

      nextToken = resp.NextToken;
    } while (nextToken);
  }

  private makeFinding(params: {
    resourceId: string;
    resourceType: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    remediation?: string;
    evidence?: Record<string, unknown>;
    passed?: boolean;
  }): SecurityFinding {
    const id = `sns-sqs-${params.resourceId}-${params.title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title: params.title,
      description: params.description,
      severity: params.severity,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      remediation: params.remediation,
      evidence: { ...params.evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed: params.passed,
    };
  }
}

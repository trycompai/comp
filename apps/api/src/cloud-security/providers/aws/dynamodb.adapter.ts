import {
  DescribeContinuousBackupsCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class DynamoDbAdapter implements AwsServiceAdapter {
  readonly serviceId = 'dynamodb';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new DynamoDBClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let exclusiveStartTableName: string | undefined;

      do {
        const listRes = await client.send(
          new ListTablesCommand({
            ExclusiveStartTableName: exclusiveStartTableName,
          }),
        );

        for (const tableName of listRes.TableNames ?? []) {
          const descRes = await client.send(
            new DescribeTableCommand({ TableName: tableName }),
          );

          const table = descRes.Table;
          if (!table) continue;

          const resourceId = table.TableArn ?? tableName;

          // Check SSE configuration
          const sse = table.SSEDescription;
          if (sse?.Status === 'ENABLED' && sse.SSEType === 'KMS') {
            findings.push(
              this.makeFinding(
                resourceId,
                'DynamoDB table uses CMK encryption',
                `Table "${tableName}" is encrypted with a customer-managed KMS key`,
                'info',
                { tableName, sseType: sse.SSEType, sseStatus: sse.Status },
                true,
              ),
            );
          } else if (sse?.Status === 'ENABLED') {
            findings.push(
              this.makeFinding(
                resourceId,
                'DynamoDB table uses default AWS-owned key',
                `Table "${tableName}" uses the default AWS-owned encryption key instead of a customer-managed KMS key`,
                'low',
                {
                  tableName,
                  sseType: sse.SSEType ?? 'DEFAULT',
                  sseStatus: sse.Status,
                },
                undefined,
                `Use dynamodb:UpdateTableCommand with TableName set to "${tableName}" and SSESpecification.SSEEnabled set to true and SSESpecification.SSEType set to 'KMS'. Optionally provide SSESpecification.KMSMasterKeyId for a specific CMK. Rollback by setting SSESpecification.SSEEnabled to false to revert to the default AWS-owned key.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'DynamoDB table uses default AWS-owned key',
                `Table "${tableName}" does not have customer-managed encryption configured`,
                'medium',
                { tableName, sseStatus: sse?.Status ?? 'NOT_CONFIGURED' },
                undefined,
                `Use dynamodb:UpdateTableCommand with TableName set to "${tableName}" and SSESpecification.SSEEnabled set to true and SSESpecification.SSEType set to 'KMS'. Optionally provide SSESpecification.KMSMasterKeyId for a specific CMK. Rollback by setting SSESpecification.SSEEnabled to false to revert to the default AWS-owned key.`,
              ),
            );
          }

          // Check Point-in-Time Recovery
          try {
            const backupRes = await client.send(
              new DescribeContinuousBackupsCommand({ TableName: tableName }),
            );

            const pitrStatus =
              backupRes.ContinuousBackupsDescription
                ?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus;

            if (pitrStatus === 'ENABLED') {
              findings.push(
                this.makeFinding(
                  resourceId,
                  'DynamoDB point-in-time recovery is enabled',
                  `Table "${tableName}" has point-in-time recovery enabled`,
                  'info',
                  { tableName, pitrStatus },
                  true,
                ),
              );
            } else {
              findings.push(
                this.makeFinding(
                  resourceId,
                  'DynamoDB point-in-time recovery is disabled',
                  `Table "${tableName}" does not have point-in-time recovery enabled`,
                  'medium',
                  { tableName, pitrStatus: pitrStatus ?? 'DISABLED' },
                  undefined,
                  `Use dynamodb:UpdateContinuousBackupsCommand with TableName set to "${tableName}" and PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled set to true. Rollback by setting PointInTimeRecoveryEnabled to false.`,
                ),
              );
            }
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            if (!msg.includes('AccessDenied')) throw error;
          }

          // Check Deletion Protection
          if (table.DeletionProtectionEnabled === true) {
            findings.push(
              this.makeFinding(
                resourceId,
                'DynamoDB deletion protection is enabled',
                `Table "${tableName}" has deletion protection enabled`,
                'info',
                { tableName, deletionProtection: true },
                true,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'DynamoDB deletion protection is disabled',
                `Table "${tableName}" does not have deletion protection enabled`,
                'medium',
                { tableName, deletionProtection: false },
                undefined,
                `Use dynamodb:UpdateTableCommand with TableName set to "${tableName}" and DeletionProtectionEnabled set to true. Rollback by setting DeletionProtectionEnabled to false.`,
              ),
            );
          }
        }

        exclusiveStartTableName = listRes.LastEvaluatedTableName;
      } while (exclusiveStartTableName);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(
    resourceId: string,
    title: string,
    description: string,
    severity: SecurityFinding['severity'],
    evidence?: Record<string, unknown>,
    passed?: boolean,
    remediation?: string,
  ): SecurityFinding {
    const id = `dynamodb-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsDynamoDbTable',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

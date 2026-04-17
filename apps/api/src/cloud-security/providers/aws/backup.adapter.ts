import {
  BackupClient,
  ListBackupPlansCommand,
  ListBackupSelectionsCommand,
} from '@aws-sdk/client-backup';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { EC2Client, DescribeVolumesCommand } from '@aws-sdk/client-ec2';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class BackupAdapter implements AwsServiceAdapter {
  readonly serviceId = 'backup';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new BackupClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if there are backup-eligible resources (RDS, DynamoDB, EBS)
    try {
      let hasBackupEligible = false;

      const rdsClient = new RDSClient({ credentials, region });
      const rdsResp = await rdsClient.send(
        new DescribeDBInstancesCommand({ MaxRecords: 20 }),
      );
      if ((rdsResp.DBInstances ?? []).length > 0) {
        hasBackupEligible = true;
      }

      if (!hasBackupEligible) {
        const ddbClient = new DynamoDBClient({ credentials, region });
        const ddbResp = await ddbClient.send(
          new ListTablesCommand({ Limit: 1 }),
        );
        if ((ddbResp.TableNames ?? []).length > 0) {
          hasBackupEligible = true;
        }
      }

      if (!hasBackupEligible) {
        const ec2Client = new EC2Client({ credentials, region });
        const volResp = await ec2Client.send(
          new DescribeVolumesCommand({ MaxResults: 5 }),
        );
        if ((volResp.Volumes ?? []).length > 0) {
          hasBackupEligible = true;
        }
      }

      if (!hasBackupEligible) return [];
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    try {
      let nextToken: string | undefined;
      let hasPlans = false;

      do {
        const listRes = await client.send(
          new ListBackupPlansCommand({ NextToken: nextToken }),
        );

        for (const plan of listRes.BackupPlansList ?? []) {
          hasPlans = true;
          const planId = plan.BackupPlanId;
          const planArn = plan.BackupPlanArn;
          const resourceId = planArn ?? planId ?? 'unknown';
          if (!planId) continue;

          let selNextToken: string | undefined;
          let hasSelections = false;

          do {
            const selRes = await client.send(
              new ListBackupSelectionsCommand({
                BackupPlanId: planId,
                NextToken: selNextToken,
              }),
            );

            if ((selRes.BackupSelectionsList ?? []).length > 0) {
              hasSelections = true;
            }

            selNextToken = selRes.NextToken;
          } while (selNextToken && !hasSelections);

          if (!hasSelections) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Backup plan has no resource selections',
                `Backup plan "${plan.BackupPlanName ?? planId}" has no resources assigned for backup`,
                'medium',
                { backupPlanId: planId, backupPlanName: plan.BackupPlanName },
                false,
                `Use backup:CreateBackupSelectionCommand with BackupPlanId set to '${planId}' and BackupSelection containing SelectionName, IamRoleArn (for backup execution), and Resources (list of ARNs) or ListOfTags to select resources by tag. Rollback: use backup:DeleteBackupSelectionCommand with BackupPlanId and SelectionId.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'Backup plan has resource selections',
                `Backup plan "${plan.BackupPlanName ?? planId}" has resources assigned`,
                'info',
                { backupPlanId: planId, backupPlanName: plan.BackupPlanName },
                true,
              ),
            );
          }
        }

        nextToken = listRes.NextToken;
      } while (nextToken);

      if (!hasPlans) {
        findings.push(
          this.makeFinding(
            `arn:aws:backup:${region}:no-plans`,
            'No backup plans configured',
            'No AWS Backup plans found in this region',
            'medium',
            { region },
            false,
            `Use backup:CreateBackupPlanCommand with BackupPlan containing BackupPlanName and Rules (array with ScheduleExpression e.g., 'cron(0 5 ? * * *)', TargetBackupVaultName, and Lifecycle.DeleteAfterDays set to 35). Then use backup:CreateBackupSelectionCommand to assign resources to the plan. Rollback: use backup:DeleteBackupPlanCommand with BackupPlanId.`,
          ),
        );
      }
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
    const id = `backup-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsBackupPlan',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

import {
  DescribeDBClustersCommand,
  NeptuneClient,
} from '@aws-sdk/client-neptune';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

/** Minimum automated-backup retention (days) we consider compliant. */
const MIN_BACKUP_RETENTION_DAYS = 7;

export class NeptuneAdapter implements AwsServiceAdapter {
  readonly serviceId = 'neptune';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new NeptuneClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let marker: string | undefined;
      do {
        const resp = await client.send(
          new DescribeDBClustersCommand({ Marker: marker, MaxRecords: 100 }),
        );

        for (const cluster of resp.DBClusters ?? []) {
          // DescribeDBClusters on the Neptune endpoint can still surface
          // non-Neptune engines in some accounts — only assess Neptune.
          if (cluster.Engine !== 'neptune') continue;

          const id = cluster.DBClusterIdentifier ?? 'unknown';
          const resourceId = cluster.DBClusterArn ?? id;

          // 1. Storage encryption at rest (not auto-fixable — enabling it on an
          //    existing cluster requires snapshot + restore into a new cluster).
          if (cluster.StorageEncrypted !== true) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster is not encrypted at rest',
                `Neptune cluster "${id}" does not have storage encryption enabled`,
                'high',
                { clusterId: id, storageEncrypted: false },
                false,
                `[MANUAL] Cannot be auto-fixed. Enabling encryption at rest on an existing Neptune cluster requires creating an encrypted snapshot and restoring it into a new cluster.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster is encrypted at rest',
                `Neptune cluster "${id}" has storage encryption enabled`,
                'info',
                { clusterId: id, storageEncrypted: true },
                true,
              ),
            );
          }

          // 2. Deletion protection.
          if (cluster.DeletionProtection !== true) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster does not have deletion protection',
                `Neptune cluster "${id}" does not have deletion protection enabled`,
                'medium',
                { clusterId: id, deletionProtection: false },
                false,
                `Use neptune:ModifyDBClusterCommand with DBClusterIdentifier "${id}" and DeletionProtection set to true. Rollback by setting DeletionProtection to false.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster has deletion protection',
                `Neptune cluster "${id}" has deletion protection enabled`,
                'info',
                { clusterId: id, deletionProtection: true },
                true,
              ),
            );
          }

          // 3. Automated backup retention.
          const retention = cluster.BackupRetentionPeriod ?? 0;
          if (retention < MIN_BACKUP_RETENTION_DAYS) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster has insufficient backup retention',
                `Neptune cluster "${id}" has a backup retention period of ${retention} day(s); at least ${MIN_BACKUP_RETENTION_DAYS} is recommended`,
                'medium',
                { clusterId: id, backupRetentionPeriod: retention },
                false,
                `Use neptune:ModifyDBClusterCommand with DBClusterIdentifier "${id}" and BackupRetentionPeriod set to ${MIN_BACKUP_RETENTION_DAYS}. Rollback by restoring the original BackupRetentionPeriod value (${retention}).`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster has sufficient backup retention',
                `Neptune cluster "${id}" has a backup retention period of ${retention} day(s)`,
                'info',
                { clusterId: id, backupRetentionPeriod: retention },
                true,
              ),
            );
          }

          // 4. IAM database authentication.
          if (cluster.IAMDatabaseAuthenticationEnabled !== true) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster does not enforce IAM database authentication',
                `Neptune cluster "${id}" does not have IAM database authentication enabled`,
                'medium',
                { clusterId: id, iamDatabaseAuthentication: false },
                false,
                `Use neptune:ModifyDBClusterCommand with DBClusterIdentifier "${id}" and EnableIAMDatabaseAuthentication set to true. Rollback by setting EnableIAMDatabaseAuthentication to false.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster enforces IAM database authentication',
                `Neptune cluster "${id}" has IAM database authentication enabled`,
                'info',
                { clusterId: id, iamDatabaseAuthentication: true },
                true,
              ),
            );
          }

          // 5. Audit logs exported to CloudWatch Logs.
          const auditEnabled = (cluster.EnabledCloudwatchLogsExports ?? []).includes(
            'audit',
          );
          if (!auditEnabled) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster does not export audit logs to CloudWatch',
                `Neptune cluster "${id}" is not exporting audit logs to CloudWatch Logs`,
                'medium',
                { clusterId: id, auditLogsToCloudWatch: false },
                false,
                `Use neptune:ModifyDBClusterCommand with DBClusterIdentifier "${id}" and CloudwatchLogsExportConfiguration set to { EnableLogTypes: ["audit"] }. Rollback by setting CloudwatchLogsExportConfiguration to { DisableLogTypes: ["audit"] }.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'Neptune cluster exports audit logs to CloudWatch',
                `Neptune cluster "${id}" exports audit logs to CloudWatch Logs`,
                'info',
                { clusterId: id, auditLogsToCloudWatch: true },
                true,
              ),
            );
          }
        }

        marker = resp.Marker;
      } while (marker);
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
    const id = `neptune-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsNeptuneCluster',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

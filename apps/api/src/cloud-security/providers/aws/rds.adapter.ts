import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

const MIN_BACKUP_RETENTION_DAYS = 7;

export class RdsAdapter implements AwsServiceAdapter {
  readonly serviceId = 'rds';
  readonly isGlobal = false;

  async scan(params: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const { credentials, region, accountId } = params;
    const client = new RDSClient({ region, credentials });

    const findings: SecurityFinding[] = [];
    let marker: string | undefined;

    do {
      const resp = await client.send(
        new DescribeDBInstancesCommand({ Marker: marker, MaxRecords: 100 }),
      );

      for (const db of resp.DBInstances || []) {
        if (!db.DBInstanceIdentifier) continue;
        findings.push(...this.checkInstance(db, region, accountId));
      }

      marker = resp.Marker;
    } while (marker);

    return findings;
  }

  private checkInstance(
    db: {
      DBInstanceIdentifier?: string;
      DBInstanceArn?: string;
      PubliclyAccessible?: boolean;
      StorageEncrypted?: boolean;
      BackupRetentionPeriod?: number;
      MultiAZ?: boolean;
      DeletionProtection?: boolean;
      Engine?: string;
    },
    region: string,
    accountId?: string,
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const id = db.DBInstanceIdentifier!;
    const arn = db.DBInstanceArn || id;

    if (db.PubliclyAccessible) {
      findings.push(
        this.makeFinding({
          id: `rds-public-${id}`,
          title: `RDS instance "${id}" is publicly accessible (${region})`,
          description: `Database instance ${id} (${db.Engine || 'unknown'}) is publicly accessible. This exposes the database to potential attacks from the internet.`,
          severity: 'critical',
          resourceId: arn,
          remediation: `Use rds:ModifyDBInstanceCommand with DBInstanceIdentifier and PubliclyAccessible set to false. Rollback by setting PubliclyAccessible to true.`,
          passed: false,
          accountId,
          region,
        }),
      );
    } else {
      findings.push(
        this.makeFinding({
          id: `rds-public-${id}`,
          title: `RDS instance "${id}" is not publicly accessible (${region})`,
          description: `Database instance ${id} is not publicly accessible.`,
          severity: 'info',
          resourceId: arn,
          passed: true,
          accountId,
          region,
        }),
      );
    }

    if (!db.StorageEncrypted) {
      findings.push(
        this.makeFinding({
          id: `rds-encryption-${id}`,
          title: `RDS instance "${id}" is not encrypted (${region})`,
          description: `Database instance ${id} does not have storage encryption enabled. Data at rest is not protected.`,
          severity: 'high',
          resourceId: arn,
          remediation: `[MANUAL] Cannot be auto-fixed. RDS encryption can only be enabled at creation time. To fix: create a snapshot using rds:CreateDBSnapshotCommand, copy the snapshot with encryption using rds:CopyDBSnapshotCommand with KmsKeyId, then restore from the encrypted snapshot using rds:RestoreDBInstanceFromDBSnapshotCommand.`,
          passed: false,
          accountId,
          region,
        }),
      );
    }

    const retention = db.BackupRetentionPeriod ?? 0;
    if (retention < MIN_BACKUP_RETENTION_DAYS) {
      findings.push(
        this.makeFinding({
          id: `rds-backup-${id}`,
          title: `RDS instance "${id}" has insufficient backup retention (${retention} days) (${region})`,
          description: `Database instance ${id} has a backup retention period of ${retention} day(s). Minimum recommended is ${MIN_BACKUP_RETENTION_DAYS} days.`,
          severity: 'medium',
          resourceId: arn,
          remediation: `Use rds:ModifyDBInstanceCommand with BackupRetentionPeriod set to at least 7. Rollback by restoring previous BackupRetentionPeriod value.`,
          passed: false,
          accountId,
          region,
        }),
      );
    }

    if (!db.DeletionProtection) {
      findings.push(
        this.makeFinding({
          id: `rds-deletion-protection-${id}`,
          title: `RDS instance "${id}" has no deletion protection (${region})`,
          description: `Database instance ${id} does not have deletion protection enabled. The instance could be accidentally deleted.`,
          severity: 'medium',
          resourceId: arn,
          remediation: `Use rds:ModifyDBInstanceCommand with DeletionProtection set to true. Rollback by setting DeletionProtection to false.`,
          passed: false,
          accountId,
          region,
        }),
      );
    }

    return findings;
  }

  private makeFinding(opts: {
    id: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    resourceId?: string;
    remediation?: string;
    passed: boolean;
    accountId?: string;
    region?: string;
  }): SecurityFinding {
    return {
      id: opts.id,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'AwsRdsDbInstance',
      resourceId: opts.resourceId || 'unknown',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        region: opts.region,
        service: 'RDS',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}

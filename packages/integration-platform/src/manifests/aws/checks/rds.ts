import { DescribeDBInstancesCommand, RDSClient } from '@aws-sdk/client-rds';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  assumeAwsSession,
  type AwsSession,
  type CheckOutcome,
  emitOutcomes,
} from './shared';

export interface RdsInstanceInfo {
  id: string;
  region: string;
  encrypted: boolean;
  backupRetentionDays: number;
  /** e.g. 'postgres', 'mysql', 'aurora-mysql' — Aurora backups are cluster-level */
  engine: string;
}

export function evaluateRdsEncryption(instances: RdsInstanceInfo[]): CheckOutcome[] {
  return instances.map((i) =>
    i.encrypted
      ? {
          kind: 'pass',
          title: `RDS storage encrypted: ${i.id}`,
          description: `RDS instance "${i.id}" (${i.region}) has storage encryption enabled.`,
          resourceType: 'aws-rds-instance',
          resourceId: i.id,
          evidence: { instance: i.id, region: i.region },
        }
      : {
          kind: 'fail',
          title: `RDS storage not encrypted: ${i.id}`,
          description: `RDS instance "${i.id}" (${i.region}) does not have storage encryption enabled.`,
          resourceType: 'aws-rds-instance',
          resourceId: i.id,
          severity: 'high',
          remediation:
            'Enable storage encryption (encryption at rest must be set at creation; restore from an encrypted snapshot to remediate).',
          evidence: { instance: i.id, region: i.region },
        },
  );
}

export function evaluateRdsBackups(instances: RdsInstanceInfo[]): CheckOutcome[] {
  return instances
    // Aurora backups are managed at the cluster level; the instance-level
    // BackupRetentionPeriod is unreliable, so don't fail Aurora instances here.
    .filter((i) => !i.engine.toLowerCase().startsWith('aurora'))
    .map((i) =>
    i.backupRetentionDays > 0
      ? {
          kind: 'pass',
          title: `RDS automated backups enabled: ${i.id}`,
          description: `RDS instance "${i.id}" (${i.region}) retains backups for ${i.backupRetentionDays} day(s).`,
          resourceType: 'aws-rds-instance',
          resourceId: i.id,
          evidence: { instance: i.id, backupRetentionDays: i.backupRetentionDays },
        }
      : {
          kind: 'fail',
          title: `RDS automated backups disabled: ${i.id}`,
          description: `RDS instance "${i.id}" (${i.region}) has automated backups disabled (retention 0).`,
          resourceType: 'aws-rds-instance',
          resourceId: i.id,
          severity: 'medium',
          remediation: 'Set a backup retention period of at least 7 days.',
          evidence: { instance: i.id },
        },
  );
}

async function listRdsInstances(session: AwsSession): Promise<RdsInstanceInfo[]> {
  const out: RdsInstanceInfo[] = [];
  for (const region of session.regions) {
    const rds = new RDSClient({ region, credentials: session.credentials });
    let marker: string | undefined;
    do {
      const resp = await rds.send(new DescribeDBInstancesCommand({ Marker: marker }));
      for (const db of resp.DBInstances ?? []) {
        out.push({
          id: db.DBInstanceIdentifier ?? 'unknown',
          region,
          encrypted: db.StorageEncrypted === true,
          backupRetentionDays: db.BackupRetentionPeriod ?? 0,
          engine: db.Engine ?? '',
        });
      }
      marker = resp.Marker;
    } while (marker);
  }
  return out;
}

export const rdsEncryptionCheck: IntegrationCheck = {
  id: 'aws-rds-encryption',
  name: 'RDS — storage encryption enabled',
  description: 'Verify all RDS instances have storage encryption at rest enabled.',
  service: 'rds',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,
  run: async (ctx: CheckContext) => {
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS RDS encryption check: connection not configured — skipping');
      return;
    }
    const instances = await listRdsInstances(session);
    if (instances.length === 0) return;
    emitOutcomes(ctx, evaluateRdsEncryption(instances));
  },
};

export const rdsBackupsCheck: IntegrationCheck = {
  id: 'aws-rds-backups',
  name: 'RDS — automated backups enabled',
  description: 'Verify all RDS instances have automated backups enabled.',
  service: 'rds',
  taskMapping: TASK_TEMPLATES.backupLogs,
  run: async (ctx: CheckContext) => {
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS RDS backups check: connection not configured — skipping');
      return;
    }
    const instances = await listRdsInstances(session);
    if (instances.length === 0) return;
    emitOutcomes(ctx, evaluateRdsBackups(instances));
  },
};

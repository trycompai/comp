import {
  DescribeDBClustersCommand,
  DescribeDBInstancesCommand,
  RDSClient,
} from '@aws-sdk/client-rds';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  resolveAwsSessionOrFail,
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

export interface RdsClusterInfo {
  id: string;
  region: string;
  encrypted: boolean;
  backupRetentionDays: number;
  /** e.g. 'aurora-mysql', 'aurora-postgresql', 'mysql' (Multi-AZ cluster) */
  engine: string;
}

export function evaluateRdsEncryption(instances: RdsInstanceInfo[]): CheckOutcome[] {
  return instances
    // Aurora encryption is managed at the cluster level; the instance-level
    // StorageEncrypted flag is unreliable, so don't evaluate Aurora instances
    // here (they are evaluated by evaluateRdsClusterEncryption instead).
    .filter((i) => !i.engine.toLowerCase().startsWith('aurora'))
    .map((i) =>
    i.encrypted
      ? {
          kind: 'pass',
          title: `RDS storage encrypted: ${i.id}`,
          description: `RDS instance "${i.id}" (${i.region}) has storage encryption enabled.`,
          resourceType: 'aws-rds-instance',
          resourceId: `${i.region}/${i.id}`,
          evidence: { instance: i.id, region: i.region },
        }
      : {
          kind: 'fail',
          title: `RDS storage not encrypted: ${i.id}`,
          description: `RDS instance "${i.id}" (${i.region}) does not have storage encryption enabled.`,
          resourceType: 'aws-rds-instance',
          resourceId: `${i.region}/${i.id}`,
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
          resourceId: `${i.region}/${i.id}`,
          evidence: { instance: i.id, backupRetentionDays: i.backupRetentionDays },
        }
      : {
          kind: 'fail',
          title: `RDS automated backups disabled: ${i.id}`,
          description: `RDS instance "${i.id}" (${i.region}) has automated backups disabled (retention 0).`,
          resourceType: 'aws-rds-instance',
          resourceId: `${i.region}/${i.id}`,
          severity: 'medium',
          remediation: 'Set a backup retention period of at least 7 days.',
          evidence: { instance: i.id },
        },
  );
}

export function evaluateRdsClusterEncryption(clusters: RdsClusterInfo[]): CheckOutcome[] {
  return clusters.map((c) =>
    c.encrypted
      ? {
          kind: 'pass',
          title: `RDS cluster storage encrypted: ${c.id}`,
          description: `RDS cluster "${c.id}" (${c.region}) has storage encryption enabled.`,
          resourceType: 'aws-rds-cluster',
          resourceId: `${c.region}/${c.id}`,
          evidence: { cluster: c.id, region: c.region },
        }
      : {
          kind: 'fail',
          title: `RDS cluster storage not encrypted: ${c.id}`,
          description: `RDS cluster "${c.id}" (${c.region}) does not have storage encryption enabled.`,
          resourceType: 'aws-rds-cluster',
          resourceId: `${c.region}/${c.id}`,
          severity: 'high',
          remediation:
            'Enable storage encryption (encryption at rest must be set at creation; restore from an encrypted snapshot to remediate).',
          evidence: { cluster: c.id, region: c.region },
        },
  );
}

export function evaluateRdsClusterBackups(clusters: RdsClusterInfo[]): CheckOutcome[] {
  return clusters.map((c) =>
    c.backupRetentionDays > 0
      ? {
          kind: 'pass',
          title: `RDS cluster automated backups enabled: ${c.id}`,
          description: `RDS cluster "${c.id}" (${c.region}) retains backups for ${c.backupRetentionDays} day(s).`,
          resourceType: 'aws-rds-cluster',
          resourceId: `${c.region}/${c.id}`,
          evidence: { cluster: c.id, backupRetentionDays: c.backupRetentionDays },
        }
      : {
          kind: 'fail',
          title: `RDS cluster automated backups disabled: ${c.id}`,
          description: `RDS cluster "${c.id}" (${c.region}) has automated backups disabled (retention 0).`,
          resourceType: 'aws-rds-cluster',
          resourceId: `${c.region}/${c.id}`,
          severity: 'medium',
          remediation: 'Set a backup retention period of at least 7 days.',
          evidence: { cluster: c.id },
        },
  );
}

interface RegionScan<T> {
  items: T[];
  /** Regions whose listing call failed — their resources are unverified. */
  failedRegions: string[];
}

async function listRdsInstances(
  session: AwsSession,
  ctx: CheckContext,
): Promise<RegionScan<RdsInstanceInfo>> {
  const items: RdsInstanceInfo[] = [];
  const failedRegions: string[] = [];
  for (const region of session.regions) {
    // Isolate per-region failures so one bad region doesn't abort the rest.
    try {
      const rds = new RDSClient({ region, credentials: session.credentials });
      let marker: string | undefined;
      do {
        const resp = await rds.send(new DescribeDBInstancesCommand({ Marker: marker }));
        for (const db of resp.DBInstances ?? []) {
          items.push({
            id: db.DBInstanceIdentifier ?? 'unknown',
            region,
            encrypted: db.StorageEncrypted === true,
            backupRetentionDays: db.BackupRetentionPeriod ?? 0,
            engine: db.Engine ?? '',
          });
        }
        marker = resp.Marker;
      } while (marker);
    } catch (err) {
      failedRegions.push(region);
      ctx.log(
        `RDS: could not list DB instances in ${region}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return { items, failedRegions };
}

async function listRdsClusters(
  session: AwsSession,
  ctx: CheckContext,
): Promise<RegionScan<RdsClusterInfo>> {
  const items: RdsClusterInfo[] = [];
  const failedRegions: string[] = [];
  for (const region of session.regions) {
    try {
      const rds = new RDSClient({ region, credentials: session.credentials });
      let marker: string | undefined;
      do {
        const resp = await rds.send(new DescribeDBClustersCommand({ Marker: marker }));
        for (const cluster of resp.DBClusters ?? []) {
          items.push({
            id: cluster.DBClusterIdentifier ?? 'unknown',
            region,
            encrypted: cluster.StorageEncrypted === true,
            backupRetentionDays: cluster.BackupRetentionPeriod ?? 0,
            engine: cluster.Engine ?? '',
          });
        }
        marker = resp.Marker;
      } while (marker);
    } catch (err) {
      failedRegions.push(region);
      ctx.log(
        `RDS: could not list DB clusters in ${region}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return { items, failedRegions };
}

/**
 * Emit a "could not verify" failure for regions whose RDS listing failed so a
 * total/partial read failure isn't recorded as a silent clean run.
 */
function failUnverifiedRegions(
  ctx: CheckContext,
  failedRegions: string[],
  what: string,
): void {
  if (failedRegions.length === 0) return;
  const regions = [...new Set(failedRegions)];
  ctx.fail({
    title: `Could not verify RDS ${what} in some regions`,
    description: `RDS resources could not be listed in: ${regions.join(', ')}, so ${what} in those regions is unverified.`,
    resourceType: 'aws-rds',
    resourceId: `regions:${regions.join(',')}`,
    severity: 'medium',
    remediation:
      'Ensure the integration role can describe RDS instances and clusters in all enabled regions, then re-run the check.',
    evidence: { failedRegions: regions },
  });
}

export const rdsEncryptionCheck: IntegrationCheck = {
  id: 'aws-rds-encryption',
  name: 'RDS — storage encryption enabled',
  description: 'Verify all RDS instances have storage encryption at rest enabled.',
  service: 'rds',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,
  run: async (ctx: CheckContext) => {
    const session = await resolveAwsSessionOrFail(ctx);
    if (!session) {
      ctx.log('AWS RDS encryption check: connection not configured — skipping');
      return;
    }
    // Evaluate non-Aurora DB instances at the instance level and DB clusters
    // (Aurora / Multi-AZ) at the cluster level — instance-level StorageEncrypted
    // is unreliable for Aurora and produces false failures.
    const instances = await listRdsInstances(session, ctx);
    const clusters = await listRdsClusters(session, ctx);
    failUnverifiedRegions(ctx, [...instances.failedRegions, ...clusters.failedRegions], 'encryption');
    if (instances.items.length === 0 && clusters.items.length === 0) return;
    emitOutcomes(ctx, evaluateRdsEncryption(instances.items));
    emitOutcomes(ctx, evaluateRdsClusterEncryption(clusters.items));
  },
};

export const rdsBackupsCheck: IntegrationCheck = {
  id: 'aws-rds-backups',
  name: 'RDS — automated backups enabled',
  description: 'Verify all RDS instances have automated backups enabled.',
  service: 'rds',
  taskMapping: TASK_TEMPLATES.backupLogs,
  run: async (ctx: CheckContext) => {
    const session = await resolveAwsSessionOrFail(ctx);
    if (!session) {
      ctx.log('AWS RDS backups check: connection not configured — skipping');
      return;
    }
    // Evaluate non-Aurora DB instances at the instance level and DB clusters
    // (Aurora / Multi-AZ) at the cluster level — instance-level
    // BackupRetentionPeriod is unreliable for Aurora and produces false failures.
    const instances = await listRdsInstances(session, ctx);
    const clusters = await listRdsClusters(session, ctx);
    failUnverifiedRegions(ctx, [...instances.failedRegions, ...clusters.failedRegions], 'backups');
    if (instances.items.length === 0 && clusters.items.length === 0) return;
    emitOutcomes(ctx, evaluateRdsBackups(instances.items));
    emitOutcomes(ctx, evaluateRdsClusterBackups(clusters.items));
  },
};

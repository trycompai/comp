import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { gcpListItems, resolveGcpProjectIds } from './shared';

interface SqlInstance {
  name: string;
  region?: string;
  /** CLOUD_SQL_INSTANCE (primary) | READ_REPLICA_INSTANCE | ON_PREMISES_INSTANCE | ... */
  instanceType?: string;
  /** Set on read replicas — points at the primary. */
  masterInstanceName?: string;
  settings?: {
    backupConfiguration?: { enabled?: boolean };
  };
}

/**
 * Cloud SQL backups check (direct API, no SCC). Verifies each Cloud SQL
 * instance has automated backups enabled.
 */
export const cloudSqlBackupsCheck: IntegrationCheck = {
  id: 'gcp-cloud-sql-backups-enabled',
  name: 'Cloud SQL — automated backups enabled',
  description: 'Verify Cloud SQL instances have automated backups enabled.',
  service: 'cloud-sql',
  taskMapping: TASK_TEMPLATES.backupLogs,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP Cloud SQL backups check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      try {
        const instances = await gcpListItems<SqlInstance>(
          ctx,
          `https://sqladmin.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/instances`,
        );
        if (instances.length === 0) continue;

        for (const inst of instances) {
          // Read replicas / on-prem instances can't configure their own backups
          // (replicas are protected by the primary's backups) — don't fail them.
          if (
            inst.masterInstanceName ||
            (inst.instanceType && inst.instanceType !== 'CLOUD_SQL_INSTANCE')
          ) {
            continue;
          }
          const enabled = inst.settings?.backupConfiguration?.enabled === true;
          if (enabled) {
            ctx.pass({
              title: `Automated backups enabled: ${inst.name}`,
              description: `Cloud SQL instance "${inst.name}" has automated backups enabled.`,
              resourceType: 'gcp-cloud-sql-instance',
              resourceId: `${projectId}/${inst.name}`,
              evidence: { projectId, instance: inst.name, region: inst.region ?? null, backupsEnabled: true },
            });
          } else {
            ctx.fail({
              title: `Automated backups disabled: ${inst.name}`,
              description: `Cloud SQL instance "${inst.name}" does not have automated backups enabled.`,
              resourceType: 'gcp-cloud-sql-instance',
              resourceId: `${projectId}/${inst.name}`,
              severity: 'medium',
              remediation:
                'Enable automated backups (and point-in-time recovery) in the instance backup settings.',
              evidence: { projectId, instance: inst.name, region: inst.region ?? null, backupsEnabled: false },
            });
          }
        }
      } catch (err) {
        // Unverified project → emit a finding, not a warn-and-skip, so an
        // all-projects-failed run doesn't leave the task stale (silent pass).
        ctx.fail({
          title: `Could not verify Cloud SQL backups: ${projectId}`,
          description: `Cloud SQL instances for project "${projectId}" could not be listed, so backup configuration is unverified.`,
          resourceType: 'gcp-project',
          resourceId: projectId,
          severity: 'medium',
          remediation:
            'Grant cloudsql.instances.list (e.g. roles/cloudsql.viewer) to the connection for this project, then re-run.',
          evidence: { projectId, error: err instanceof Error ? err.message : String(err) },
        });
        continue;
      }
    }
  },
};

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { resolveGcpProjectIds } from './shared';

interface SqlInstance {
  name: string;
  region?: string;
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
      const data = await ctx.fetch<{ items?: SqlInstance[] }>(
        `https://sqladmin.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/instances`,
      );
      const instances = data.items ?? [];
      if (instances.length === 0) continue;

      for (const inst of instances) {
        const enabled = inst.settings?.backupConfiguration?.enabled === true;
        if (enabled) {
          ctx.pass({
            title: `Automated backups enabled: ${inst.name}`,
            description: `Cloud SQL instance "${inst.name}" has automated backups enabled.`,
            resourceType: 'gcp-cloud-sql-instance',
            resourceId: inst.name,
            evidence: { projectId, instance: inst.name },
          });
        } else {
          ctx.fail({
            title: `Automated backups disabled: ${inst.name}`,
            description: `Cloud SQL instance "${inst.name}" does not have automated backups enabled.`,
            resourceType: 'gcp-cloud-sql-instance',
            resourceId: inst.name,
            severity: 'medium',
            remediation:
              'Enable automated backups (and point-in-time recovery) in the instance backup settings.',
            evidence: { projectId, instance: inst.name },
          });
        }
      }
    }
  },
};

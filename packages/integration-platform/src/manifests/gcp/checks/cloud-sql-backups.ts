import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  remediationForReadFailure,
  toHttpReadFailure,
} from '../../http-read-failure';
import { gcpListItems, resolveGcpProjectIds, isGcpApiDisabled } from './shared';

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
        // The service's API simply isn't enabled on this project (403
        // SERVICE_DISABLED) — nothing of this type exists here to evaluate,
        // so skip it like a zero-resource project instead of emitting a
        // false "grant permission" finding.
        if (isGcpApiDisabled(err)) {
          ctx.log(`GCP Cloud SQL: API not enabled in project "${projectId}" — no Cloud SQL instances to evaluate; skipping`);
          continue;
        }
        const failure = toHttpReadFailure(err);
        ctx.fail({
          title: `Could not verify Cloud SQL backups: ${projectId}`,
          description: `Cloud SQL instances for project "${projectId}" could not be listed (${failure.error}), so backup configuration is unverified.`,
          resourceType: 'gcp-project',
          resourceId: projectId,
          severity: 'medium',
          remediation: remediationForReadFailure(
            failure,
            'Grant cloudsql.instances.list (e.g. roles/cloudsql.viewer) to the connection for this project, then re-run.',
          ),
          evidence: { projectId, error: failure.error },
        });
        continue;
      }
    }
  },
};

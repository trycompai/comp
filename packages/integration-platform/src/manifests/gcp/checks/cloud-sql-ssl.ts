import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { gcpListItems, resolveGcpProjectIds } from './shared';

interface SqlInstance {
  name: string;
  region?: string;
  settings?: {
    ipConfiguration?: { requireSsl?: boolean; sslMode?: string };
  };
}

const SECURE_SSL_MODES = new Set([
  'ENCRYPTED_ONLY',
  'TRUSTED_CLIENT_CERTIFICATE_REQUIRED',
]);

/**
 * Cloud SQL SSL/TLS check (direct API, no SCC). Verifies each Cloud SQL
 * instance requires encrypted connections (sslMode ENCRYPTED_ONLY / trusted
 * client cert, or legacy requireSsl).
 */
export const cloudSqlSslCheck: IntegrationCheck = {
  id: 'gcp-cloud-sql-ssl-enforced',
  name: 'Cloud SQL — SSL/TLS enforced',
  description: 'Verify Cloud SQL instances require SSL/TLS for connections.',
  service: 'cloud-sql',
  taskMapping: TASK_TEMPLATES.tlsHttps,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP Cloud SQL SSL check: no projects resolved — skipping');
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
          const ip = inst.settings?.ipConfiguration;
          // sslMode is authoritative when present; fall back to legacy requireSsl.
          const sslEnforced =
            typeof ip?.sslMode === 'string'
              ? SECURE_SSL_MODES.has(ip.sslMode)
              : ip?.requireSsl === true;

          if (sslEnforced) {
            ctx.pass({
              title: `SSL/TLS enforced: ${inst.name}`,
              description: `Cloud SQL instance "${inst.name}" requires encrypted connections.`,
              resourceType: 'gcp-cloud-sql-instance',
              resourceId: `${projectId}/${inst.name}`,
              evidence: {
                projectId,
                instance: inst.name,
                sslMode: ip?.sslMode ?? null,
                requireSsl: ip?.requireSsl ?? null,
              },
            });
          } else {
            ctx.fail({
              title: `SSL/TLS not enforced: ${inst.name}`,
              description: `Cloud SQL instance "${inst.name}" does not require SSL/TLS for connections.`,
              resourceType: 'gcp-cloud-sql-instance',
              resourceId: `${projectId}/${inst.name}`,
              severity: 'medium',
              remediation:
                'Set the SSL mode to ENCRYPTED_ONLY (or require trusted client certificates) to enforce encrypted connections.',
              evidence: {
                projectId,
                instance: inst.name,
                sslMode: ip?.sslMode ?? null,
                requireSsl: ip?.requireSsl ?? null,
              },
            });
          }
        }
      } catch (err) {
        // Unverified project → emit a finding, not a warn-and-skip, so an
        // all-projects-failed run doesn't leave the task stale (silent pass).
        ctx.fail({
          title: `Could not verify Cloud SQL SSL: ${projectId}`,
          description: `Cloud SQL instances for project "${projectId}" could not be listed, so SSL/TLS enforcement is unverified.`,
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

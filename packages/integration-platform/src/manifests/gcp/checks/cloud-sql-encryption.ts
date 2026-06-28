import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  remediationForReadFailure,
  toHttpReadFailure,
} from '../../http-read-failure';
import { gcpListItems, isGcpApiDisabled, resolveGcpProjectIds } from './shared';

interface SqlInstance {
  name: string;
  region?: string;
  diskEncryptionConfiguration?: {
    /** Set only when the instance disk uses a customer-managed key (CMEK). */
    kmsKeyName?: string;
  };
}

/**
 * Cloud SQL encryption-at-rest check (direct API, no SCC).
 *
 * Cloud SQL data and backups are always encrypted at rest by default with
 * Google-managed keys — this cannot be disabled — so every instance passes.
 * The check surfaces GCP on the Encryption at Rest task and records per-instance
 * evidence of the key type (Google-managed vs CMEK). Mirrors the AWS RDS
 * storage-encryption check. Only read failures produce a finding.
 */
export const cloudSqlEncryptionCheck: IntegrationCheck = {
  id: 'gcp-cloud-sql-encryption',
  name: 'Cloud SQL — encryption at rest',
  description:
    'Verify Cloud SQL instances are encrypted at rest (Google-managed by default; reports CMEK).',
  service: 'cloud-sql',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP Cloud SQL encryption check: no projects resolved — skipping');
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
          const cmekKey = inst.diskEncryptionConfiguration?.kmsKeyName ?? null;
          ctx.pass({
            title: `Encrypted at rest: ${inst.name}`,
            description: `Cloud SQL instance "${inst.name}" is encrypted at rest with ${cmekKey ? 'a customer-managed key (CMEK)' : 'Google-managed encryption (AES-256)'}.`,
            resourceType: 'gcp-cloud-sql-instance',
            resourceId: `${projectId}/${inst.name}`,
            evidence: {
              projectId,
              instance: inst.name,
              region: inst.region ?? null,
              keyType: cmekKey ? 'CMEK' : 'Google-managed',
              kmsKeyName: cmekKey,
            },
          });
        }
      } catch (err) {
        if (isGcpApiDisabled(err)) {
          ctx.log(
            `GCP Cloud SQL: API not enabled in project "${projectId}" — no Cloud SQL instances to evaluate; skipping`,
          );
          continue;
        }
        const failure = toHttpReadFailure(err);
        ctx.fail({
          title: `Could not verify Cloud SQL encryption: ${projectId}`,
          description: `Cloud SQL instances for project "${projectId}" could not be listed (${failure.error}), so encryption at rest is unverified.`,
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

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  remediationForReadFailure,
  toHttpReadFailure,
} from '../../http-read-failure';
import { gcpListItems, isGcpApiDisabled, resolveGcpProjectIds } from './shared';

interface Bucket {
  name: string;
  location?: string;
  encryption?: {
    /** Set only when a customer-managed key (CMEK) is the bucket default. */
    defaultKmsKeyName?: string;
  };
}

/**
 * Cloud Storage encryption-at-rest check (direct API, no SCC).
 *
 * Google Cloud encrypts ALL data at rest by default with Google-managed
 * AES-256 keys — this cannot be disabled — so every bucket passes. The check
 * exists to (a) surface GCP on the Encryption at Rest task like AWS/Azure and
 * (b) record per-bucket evidence of the key type (Google-managed vs CMEK),
 * which is the deliverable an auditor wants. Mirrors the AWS S3 default-
 * encryption check. Only read failures produce a finding (never a silent pass).
 */
export const storageEncryptionCheck: IntegrationCheck = {
  id: 'gcp-storage-encryption',
  name: 'Cloud Storage — encryption at rest',
  description:
    'Verify Cloud Storage buckets are encrypted at rest (Google-managed by default; reports CMEK).',
  service: 'cloud-storage',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP storage encryption check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      try {
        const buckets = await gcpListItems<Bucket>(
          ctx,
          `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(projectId)}`,
        );
        if (buckets.length === 0) continue; // nothing to evidence for this project

        for (const bucket of buckets) {
          const cmekKey = bucket.encryption?.defaultKmsKeyName ?? null;
          ctx.pass({
            title: `Encrypted at rest: ${bucket.name}`,
            description: `Bucket "${bucket.name}" is encrypted at rest with ${cmekKey ? 'a customer-managed key (CMEK)' : 'Google-managed encryption (AES-256)'}.`,
            resourceType: 'gcp-storage-bucket',
            resourceId: `${projectId}/${bucket.name}`,
            evidence: {
              projectId,
              bucket: bucket.name,
              location: bucket.location ?? null,
              keyType: cmekKey ? 'CMEK' : 'Google-managed',
              defaultKmsKeyName: cmekKey,
            },
          });
        }
      } catch (err) {
        // API not enabled on this project → no buckets to evaluate; skip rather
        // than emit a false "grant permission" finding.
        if (isGcpApiDisabled(err)) {
          ctx.log(
            `GCP Cloud Storage: API not enabled in project "${projectId}" — no buckets to evaluate; skipping`,
          );
          continue;
        }
        const failure = toHttpReadFailure(err);
        ctx.fail({
          title: `Could not verify Cloud Storage encryption: ${projectId}`,
          description: `Buckets for project "${projectId}" could not be listed (${failure.error}), so encryption at rest is unverified.`,
          resourceType: 'gcp-project',
          resourceId: projectId,
          severity: 'medium',
          remediation: remediationForReadFailure(
            failure,
            'Grant storage.buckets.list (e.g. roles/storage.legacyBucketReader or Viewer) to the connection for this project, then re-run.',
          ),
          evidence: { projectId, error: failure.error },
        });
      }
    }
  },
};

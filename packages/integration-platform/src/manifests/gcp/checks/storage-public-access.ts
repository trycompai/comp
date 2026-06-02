import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { gcpListItems, resolveGcpProjectIds } from './shared';

interface Bucket {
  name: string;
  location?: string;
  iamConfiguration?: {
    uniformBucketLevelAccess?: { enabled?: boolean };
    publicAccessPrevention?: string;
  };
}

/**
 * Cloud Storage public-access check (direct API, no SCC). Uses bucket metadata
 * only (no per-bucket IAM calls) to flag buckets that don't enforce uniform
 * bucket-level access or public access prevention.
 */
export const storagePublicAccessCheck: IntegrationCheck = {
  id: 'gcp-storage-no-public-access',
  name: 'Cloud Storage — no public access',
  description:
    'Verify Cloud Storage buckets enforce uniform bucket-level access and public access prevention.',
  service: 'cloud-storage',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP storage check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      const buckets = await gcpListItems<Bucket>(
        ctx,
        `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(projectId)}`,
      );
      if (buckets.length === 0) continue; // nothing to evidence for this project

      let violations = 0;
      for (const bucket of buckets) {
        const iam = bucket.iamConfiguration;
        if (iam?.uniformBucketLevelAccess?.enabled !== true) {
          violations++;
          ctx.fail({
            title: `Uniform bucket-level access disabled: ${bucket.name}`,
            description: `Bucket "${bucket.name}" allows fine-grained ACLs, which can expose individual objects publicly.`,
            resourceType: 'gcp-storage-bucket',
            resourceId: bucket.name,
            severity: 'medium',
            remediation:
              'Enable uniform bucket-level access so permissions are managed exclusively through IAM.',
            evidence: { projectId, bucket: bucket.name },
          });
        }
        if (iam?.publicAccessPrevention !== 'enforced') {
          violations++;
          ctx.fail({
            title: `Public access prevention not enforced at the bucket level: ${bucket.name}`,
            description: `Bucket "${bucket.name}" does not set public access prevention to "enforced" at the bucket level (current: ${iam?.publicAccessPrevention ?? 'inherited'}). If an org policy enforces it, this inherits — verify the org policy or set it explicitly on the bucket.`,
            resourceType: 'gcp-storage-bucket',
            resourceId: bucket.name,
            severity: 'medium',
            remediation:
              'Set public access prevention to "enforced" to block all public access regardless of IAM/ACLs.',
            evidence: {
              projectId,
              bucket: bucket.name,
              publicAccessPrevention: iam?.publicAccessPrevention ?? null,
            },
          });
        }
      }

      if (violations === 0) {
        ctx.pass({
          title: 'Cloud Storage not publicly accessible',
          description: `All ${buckets.length} bucket(s) in "${projectId}" enforce uniform access and public access prevention.`,
          resourceType: 'gcp-project',
          resourceId: projectId,
          evidence: { projectId, bucketCount: buckets.length },
        });
      }
    }
  },
};

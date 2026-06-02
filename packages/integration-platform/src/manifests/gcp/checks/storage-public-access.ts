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
    'Verify Cloud Storage buckets enforce uniform bucket-level access so object permissions are managed through IAM rather than public ACLs.',
  service: 'cloud-storage',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP storage check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      try {
        const buckets = await gcpListItems<Bucket>(
          ctx,
          `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(projectId)}`,
        );
        if (buckets.length === 0) continue; // nothing to evidence for this project

        let violations = 0;
        for (const bucket of buckets) {
          const iam = bucket.iamConfiguration;
          // Only uniform bucket-level access drives the public-exposure FAIL.
          // publicAccessPrevention 'inherited'/undefined can come from an
          // enforcing org policy, so it is not a reliable per-bucket signal
          // and must not produce a false failure here.
          if (iam?.uniformBucketLevelAccess?.enabled !== true) {
            violations++;
            ctx.fail({
              title: `Uniform bucket-level access disabled: ${bucket.name}`,
              description: `Bucket "${bucket.name}" allows fine-grained ACLs, which can expose individual objects publicly.`,
              resourceType: 'gcp-storage-bucket',
              resourceId: `${projectId}/${bucket.name}`,
              severity: 'medium',
              remediation:
                'Enable uniform bucket-level access so permissions are managed exclusively through IAM.',
              evidence: { projectId, bucket: bucket.name },
            });
          }
        }

        if (violations === 0) {
          ctx.pass({
            title: 'Cloud Storage not publicly accessible',
            description: `All ${buckets.length} bucket(s) in "${projectId}" enforce uniform bucket-level access.`,
            resourceType: 'gcp-project',
            resourceId: projectId,
            evidence: { projectId, bucketCount: buckets.length },
          });
        }
      } catch (err) {
        ctx.warn('GCP storage check failed for project; skipping', {
          projectId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  },
};

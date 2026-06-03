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

interface BucketIamPolicy {
  bindings?: Array<{ role?: string; members?: string[] }>;
}

const PUBLIC_MEMBERS = new Set(['allUsers', 'allAuthenticatedUsers']);

/**
 * Cloud Storage public-access check (direct API, no SCC). A bucket is public if
 * its IAM policy grants a role to `allUsers`/`allAuthenticatedUsers`, so uniform
 * bucket-level access alone is NOT sufficient — we read each bucket's IAM
 * policy. `publicAccessPrevention: 'enforced'` definitively blocks public access
 * (regardless of IAM/ACLs) and is treated as compliant; 'inherited'/undefined is
 * ambiguous (may be enforced by org policy) so it is not itself a failure.
 */
export const storagePublicAccessCheck: IntegrationCheck = {
  id: 'gcp-storage-no-public-access',
  name: 'Cloud Storage — no public access',
  description:
    'Verify Cloud Storage buckets are not granted to allUsers/allAuthenticatedUsers and enforce uniform bucket-level access.',
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

        for (const bucket of buckets) {
          await evaluateBucket(ctx, projectId, bucket);
        }
      } catch (err) {
        // Unverified project → emit a finding, not a warn-and-skip, so an
        // all-projects-failed run doesn't leave the task stale (silent pass).
        ctx.fail({
          title: `Could not verify Cloud Storage: ${projectId}`,
          description: `Buckets for project "${projectId}" could not be listed, so public access is unverified.`,
          resourceType: 'gcp-project',
          resourceId: projectId,
          severity: 'medium',
          remediation:
            'Grant storage.buckets.list (e.g. roles/storage.legacyBucketReader or Viewer) to the connection for this project, then re-run.',
          evidence: {
            projectId,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  },
};

async function evaluateBucket(
  ctx: CheckContext,
  projectId: string,
  bucket: Bucket,
): Promise<void> {
  const iam = bucket.iamConfiguration;
  const resourceId = `${projectId}/${bucket.name}`;

  // Public Access Prevention 'enforced' blocks all public access regardless of
  // IAM bindings or ACLs — definitively compliant, no IAM read needed.
  if (iam?.publicAccessPrevention === 'enforced') {
    ctx.pass({
      title: `Public access prevention enforced: ${bucket.name}`,
      description: `Bucket "${bucket.name}" enforces public access prevention, which blocks all anonymous access.`,
      resourceType: 'gcp-storage-bucket',
      resourceId,
      evidence: { projectId, bucket: bucket.name, publicAccessPrevention: 'enforced' },
    });
    return;
  }

  // Otherwise the authoritative signal is the bucket IAM policy: a binding to
  // allUsers/allAuthenticatedUsers makes the bucket public. UBLA alone does not
  // prevent this, so we must read the policy rather than infer from metadata.
  let policy: BucketIamPolicy;
  try {
    policy = await ctx.fetch<BucketIamPolicy>(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket.name)}/iam`,
    );
  } catch (err) {
    // Couldn't read the policy → unverified, never a silent pass.
    ctx.fail({
      title: `Could not verify public access: ${bucket.name}`,
      description: `Bucket "${bucket.name}" IAM policy could not be read, so public access is unverified.`,
      resourceType: 'gcp-storage-bucket',
      resourceId,
      severity: 'medium',
      remediation:
        'Grant storage.buckets.getIamPolicy (e.g. roles/storage.legacyBucketReader or Viewer) to the connection, then re-run.',
      evidence: {
        projectId,
        bucket: bucket.name,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return;
  }

  const publicMembers = (policy.bindings ?? [])
    .flatMap((b) => b.members ?? [])
    .filter((m) => PUBLIC_MEMBERS.has(m));

  if (publicMembers.length > 0) {
    ctx.fail({
      title: `Bucket publicly accessible: ${bucket.name}`,
      description: `Bucket "${bucket.name}" grants access to ${[...new Set(publicMembers)].join(', ')} via its IAM policy.`,
      resourceType: 'gcp-storage-bucket',
      resourceId,
      severity: 'high',
      remediation:
        'Remove allUsers/allAuthenticatedUsers from the bucket IAM policy and enable public access prevention.',
      evidence: { projectId, bucket: bucket.name, publicMembers: [...new Set(publicMembers)] },
    });
    return;
  }

  if (iam?.uniformBucketLevelAccess?.enabled !== true) {
    // No public IAM bindings, but fine-grained ACLs are enabled — individual
    // objects can still be made public via ACLs, which can't be verified from
    // the bucket policy. Flag it rather than pass on incomplete coverage.
    ctx.fail({
      title: `Uniform bucket-level access disabled: ${bucket.name}`,
      description: `Bucket "${bucket.name}" allows fine-grained ACLs, so individual objects can be exposed publicly via ACLs (not covered by the bucket IAM policy).`,
      resourceType: 'gcp-storage-bucket',
      resourceId,
      severity: 'medium',
      remediation:
        'Enable uniform bucket-level access so permissions are managed exclusively through IAM.',
      evidence: { projectId, bucket: bucket.name },
    });
    return;
  }

  ctx.pass({
    title: `No public access: ${bucket.name}`,
    description: `Bucket "${bucket.name}" has no allUsers/allAuthenticatedUsers IAM bindings and enforces uniform bucket-level access.`,
    resourceType: 'gcp-storage-bucket',
    resourceId,
    evidence: { projectId, bucket: bucket.name },
  });
}

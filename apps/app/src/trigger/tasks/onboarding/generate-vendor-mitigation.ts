import { isOrgParticipant } from '@/lib/org-participation-rule';
import { VendorStatus, db } from '@db/server';
import { logger, metadata, queue, tags, task, tasks } from '@trigger.dev/sdk';
import axios from 'axios';
import {
  createVendorRiskComment,
  findCommentAuthor,
  type PolicyContext,
} from './onboard-organization-helpers';

// Queues
const vendorMitigationQueue = queue({ name: 'vendor-risk-mitigations', concurrencyLimit: 50 });
const vendorMitigationFanoutQueue = queue({
  name: 'vendor-risk-mitigations-fanout',
  concurrencyLimit: 50,
});

export const generateVendorMitigation = task({
  id: 'generate-vendor-mitigation',
  queue: vendorMitigationQueue,
  retry: {
    maxAttempts: 5,
  },
  run: async (payload: {
    organizationId: string;
    vendorId: string;
    authorId?: string;
    policies: PolicyContext[];
  }) => {
    const { organizationId, vendorId, authorId, policies } = payload;
    await tags.add([`org:${organizationId}`]);
    logger.info(`Generating vendor mitigation for vendor ${vendorId} in org ${organizationId}`);

    const vendor = await db.vendor.findFirst({ where: { id: vendorId, organizationId } });

    if (!vendor) {
      logger.warn(`Vendor ${vendorId} not found in org ${organizationId}`);
      return;
    }

    // Mark as processing before generating mitigation
    // Update root onboarding task metadata if available (when triggered from onboarding)
    // Try root first (onboarding task), then parent (fanout task), then own metadata
    const metadataHandle = metadata.root ?? metadata.parent ?? metadata;
    metadataHandle.set(`vendor_${vendorId}_status`, 'processing');

    await createVendorRiskComment(vendor, policies, organizationId, authorId ?? '');

    // Mark vendor as assessed. Only reassign if we have an author;
    // platform admins are hidden from the assignee UI, so skip them too.
    let assigneeUpdate: { assigneeId: string | null } | Record<string, never> = {};
    if (authorId) {
      const [author, org] = await Promise.all([
        db.member.findFirst({
          where: { id: authorId, organizationId },
          include: { user: { select: { role: true } } },
        }),
        db.organization.findUnique({
          where: { id: organizationId },
          select: { isInternal: true },
        }),
      ]);
      // Only assign when the author is a real member of THIS org and is a
      // participant (fail closed if the lookup missed — never write an unknown
      // or cross-org member id).
      assigneeUpdate = {
        assigneeId:
          author &&
          isOrgParticipant(author.user.role, {
            orgIsInternal: org?.isInternal ?? false,
          })
            ? authorId
            : null,
      };
    }

    await db.vendor.update({
      where: { id: vendor.id, organizationId },
      data: {
        status: VendorStatus.assessed,
        ...assigneeUpdate,
      },
    });

    // Mark as completed after mitigation is done
    // Update root onboarding task metadata if available
    metadataHandle.set(`vendor_${vendorId}_status`, 'completed');
    metadataHandle.increment('vendorsCompleted', 1);
    metadataHandle.decrement('vendorsRemaining', 1);

    // Revalidate the vendor detail page so the new comment shows up
    try {
      const detailPath = `/${organizationId}/vendors/${vendorId}`;
      await axios.post(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/revalidate/path`, {
        path: detailPath,
        secret: process.env.REVALIDATION_SECRET,
      });
      logger.info(`Revalidated vendor path: ${detailPath}`);
    } catch (e) {
      logger.error('Failed to revalidate vendor paths after mitigation', { e });
    }
  },
});

export const generateVendorMitigationsForOrg = task({
  id: 'generate-vendor-mitigations-for-org',
  queue: vendorMitigationFanoutQueue,
  run: async (payload: { organizationId: string }) => {
    const { organizationId } = payload;
    await tags.add([`org:${organizationId}`]);
    logger.info(`Fan-out vendor mitigations for org ${organizationId}`);

    const [vendors, policyRows, author] = await Promise.all([
      db.vendor.findMany({ where: { organizationId } }),
      db.policy.findMany({
        where: { organizationId },
        select: { name: true, description: true },
      }),
      findCommentAuthor(organizationId),
    ]);

    if (vendors.length === 0) {
      logger.info(`No vendors found for org ${organizationId}`);
      return;
    }

    if (!author) {
      logger.warn(
        `No onboarding author found for org ${organizationId}; treatment descriptions will generate but vendors will not be reassigned`,
      );
    }

    const policies = policyRows.map((p) => ({ name: p.name, description: p.description }));

    const batchResult = await tasks.batchTriggerAndWait<typeof generateVendorMitigation>(
      'generate-vendor-mitigation',
      vendors.map((v) => ({
        payload: {
          organizationId,
          vendorId: v.id,
          authorId: author?.id,
          policies,
        },
        options: { concurrencyKey: `${organizationId}:${v.id}` },
      })),
    );
    const failures = batchResult.runs.filter((r) => !r.ok);
    if (failures.length > 0) {
      logger.error(`${failures.length} vendor mitigation(s) failed`, {
        failedRunIds: failures.map((r) => r.id),
      });
    }

    // Revalidate the parent vendors route after batch triggering
    try {
      const parentPath = `/${organizationId}/vendors`;
      await axios.post(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/revalidate/path`, {
        path: parentPath,
        secret: process.env.REVALIDATION_SECRET,
      });
      logger.info(`Revalidated vendors parent path: ${parentPath}`);
    } catch (e) {
      logger.error('Failed to revalidate vendors parent path after batch', { e });
    }
  },
});

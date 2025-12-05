import { VendorStatus, db } from '@db';
import { logger, metadata, queue, task } from '@trigger.dev/sdk';
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
    authorId: string;
    policies: PolicyContext[];
  }) => {
    const { organizationId, vendorId, authorId, policies } = payload;
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

    await createVendorRiskComment(vendor, policies, organizationId, authorId);

    // Mark vendor as assessed and assign to owner/admin
    await db.vendor.update({
      where: { id: vendor.id, organizationId },
      data: {
        status: VendorStatus.assessed,
        assigneeId: authorId,
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
        `No onboarding author found for org ${organizationId}; skipping vendor mitigations`,
      );
      return;
    }

    const policies = policyRows.map((p) => ({ name: p.name, description: p.description }));

    await generateVendorMitigation.batchTrigger(
      vendors.map((v) => ({
        payload: {
          organizationId,
          vendorId: v.id,
          authorId: author.id,
          policies,
        },
        concurrencyKey: `${organizationId}:${v.id}`,
      })),
    );

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

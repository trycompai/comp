import { VendorStatus, db } from '@db';
import { logger, metadata, queue, task } from '@trigger.dev/sdk';
import axios from 'axios';
import {
  createVendorRiskComment,
  findCommentAuthor,
  type PolicyContext,
} from './onboard-organization-helpers';

// Queues
const vendorMitigationQueue = queue({ name: 'vendor-risk-mitigations', concurrencyLimit: 100 });
const vendorMitigationFanoutQueue = queue({
  name: 'vendor-risk-mitigations-fanout',
  concurrencyLimit: 100,
});

export const generateVendorMitigation = task({
  id: 'generate-vendor-mitigation',
  queue: vendorMitigationQueue,
  retry: {
    maxAttempts: 5,
  },
  run: async (payload: { organizationId: string; vendorId: string }) => {
    const { organizationId, vendorId } = payload;
    logger.info(`Generating vendor mitigation for vendor ${vendorId} in org ${organizationId}`);

    const [vendor, policies, author] = await Promise.all([
      db.vendor.findFirst({ where: { id: vendorId, organizationId } }),
      db.policy.findMany({ where: { organizationId }, select: { name: true, description: true } }),
      findCommentAuthor(organizationId),
    ]);

    if (!vendor) {
      logger.warn(`Vendor ${vendorId} not found in org ${organizationId}`);
      return;
    }

    if (!author) {
      logger.warn(
        `No eligible author found for org ${organizationId}; skipping mitigation for vendor ${vendorId}`,
      );
      return;
    }

    // Mark as processing before generating mitigation
    // Update root onboarding task metadata if available (when triggered from onboarding)
    // Try root first (onboarding task), then parent (fanout task), then own metadata
    const targetMetadata = metadata.root || metadata.parent || metadata;
    targetMetadata.set(`vendor_${vendorId}_status`, 'processing');

    await createVendorRiskComment(vendor, policies as PolicyContext[], organizationId, author.id);

    // Mark vendor as assessed and assign to owner/admin
    await db.vendor.update({
      where: { id: vendor.id, organizationId },
      data: {
        status: VendorStatus.assessed,
        assigneeId: author.id,
      },
    });

    // Mark as completed after mitigation is done
    // Update root onboarding task metadata if available
    targetMetadata.set(`vendor_${vendorId}_status`, 'completed');

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

    const vendors = await db.vendor.findMany({ where: { organizationId } });
    if (vendors.length === 0) {
      logger.info(`No vendors found for org ${organizationId}`);
      return;
    }

    await generateVendorMitigation.batchTrigger(
      vendors.map((v) => ({
        payload: { organizationId, vendorId: v.id },
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

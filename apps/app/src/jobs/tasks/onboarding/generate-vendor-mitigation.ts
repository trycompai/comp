import { VendorStatus, db } from '@db';
import { logger, queue, task } from '@trigger.dev/sdk';
import {
  createVendorRiskComment,
  findCommentAuthor,
  type PolicyContext,
} from './onboard-organization-helpers';

// Queues
const vendorMitigationQueue = queue({ name: 'vendor-risk-mitigations', concurrencyLimit: 10 });
const vendorMitigationFanoutQueue = queue({
  name: 'vendor-risk-mitigations-fanout',
  concurrencyLimit: 3,
});

export const generateVendorMitigation = task({
  id: 'generate-vendor-mitigation',
  queue: vendorMitigationQueue,
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

    await createVendorRiskComment(vendor, policies as PolicyContext[], organizationId, author.id);

    // Mark vendor as assessed and assign to owner/admin
    await db.vendor.update({
      where: { id: vendor.id, organizationId },
      data: {
        status: VendorStatus.assessed,
        assigneeId: author.id,
      },
    });
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
  },
});

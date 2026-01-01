import { db } from '@db';
import { logger, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { VENDOR_RISK_ASSESSMENT_TASK_ID, VENDOR_RISK_ASSESSMENT_TASK_TITLE } from './vendor-risk-assessment/constants';
import { vendorRiskAssessmentTask } from './vendor-risk-assessment-task';

const schema = z.object({
  organizationId: z.string().optional(),
  /**
   * Backfill default is true so existing vendors get enriched with links/overview.
   * If you want a cheaper/faster run, set this to false.
   */
  withResearch: z.boolean().optional().default(true),
  /**
   * Safety limit per run (per org or total).
   */
  limit: z.number().int().min(1).max(5000).optional().default(500),
  /**
   * If true, will not create tasks; only logs how many would be created.
   */
  dryRun: z.boolean().optional().default(false),
});

export const backfillVendorRiskAssessmentTasks = schemaTask({
  id: 'backfill-vendor-risk-assessment-tasks',
  schema,
  maxDuration: 1000 * 60 * 15,
  run: async (payload) => {
    logger.info('Backfill vendor risk assessment tasks started', payload);

    const orgIds = payload.organizationId
      ? [payload.organizationId]
      : (
          await db.organization.findMany({
            select: { id: true },
          })
        ).map((o) => o.id);

    let totalMissing = 0;
    let totalTriggered = 0;

    for (const organizationId of orgIds) {
      // Fetch all vendors for org (lightweight)
      const vendors = await db.vendor.findMany({
        where: { organizationId },
        select: { id: true, name: true, website: true },
      });

      if (vendors.length === 0) continue;

      // Fetch existing Risk Assessment task items for vendors in this org
      const existingTaskItems = await db.taskItem.findMany({
        where: {
          organizationId,
          entityType: 'vendor',
          title: VENDOR_RISK_ASSESSMENT_TASK_TITLE,
        },
        select: { entityId: true },
      });

      const vendorIdsWithTasks = new Set(existingTaskItems.map((t) => t.entityId));
      const missingVendors = vendors.filter((v) => !vendorIdsWithTasks.has(v.id));

      const limitedMissing = missingVendors.slice(0, payload.limit - totalMissing);
      totalMissing += limitedMissing.length;

      logger.info('Backfill org scan', {
        organizationId,
        vendors: vendors.length,
        existingTasks: vendorIdsWithTasks.size,
        missing: limitedMissing.length,
      });

      if (payload.dryRun) {
        if (totalMissing >= payload.limit) break;
        continue;
      }

      if (limitedMissing.length > 0) {
        const batch = limitedMissing.map((v) => ({
          payload: {
            vendorId: v.id,
            vendorName: v.name,
            vendorWebsite: v.website,
            organizationId,
            createdByUserId: null,
            withResearch: payload.withResearch,
          },
        }));

        await vendorRiskAssessmentTask.batchTrigger(batch);
        totalTriggered += batch.length;
      }

      if (totalMissing >= payload.limit) break;
    }

    logger.info('Backfill vendor risk assessment tasks completed', {
      totalMissing,
      totalTriggered,
      dryRun: payload.dryRun,
    });

    return {
      success: true,
      totalMissing,
      totalTriggered,
      dryRun: payload.dryRun,
    };
  },
});



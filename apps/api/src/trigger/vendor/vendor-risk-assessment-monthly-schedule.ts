import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { vendorRiskAssessmentTask } from './vendor-risk-assessment-task';

/**
 * Monthly scheduled task that refreshes risk assessments for all vendors.
 * Runs on the 1st of each month at 2:00 AM UTC.
 */
export const vendorRiskAssessmentMonthlySchedule = schedules.task({
  id: 'vendor-risk-assessment-monthly-schedule',
  cron: '0 2 1 * *', // 1st of each month at 2:00 AM UTC
  maxDuration: 1000 * 60 * 60, // 1 hour (for batch processing)
  run: async (payload) => {
    logger.info('Monthly vendor risk assessment refresh started', {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    // Find all vendors across all organizations that have websites
    const vendors = await db.vendor.findMany({
      where: {
        website: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        website: true,
        organizationId: true,
      },
    });

    logger.info(`Found ${vendors.length} unique vendors with websites`);

    if (vendors.length === 0) {
      return {
        success: true,
        totalVendors: 0,
        triggered: 0,
        message: 'No vendors with websites found',
      };
    }

    // Process ALL vendors - monthly refresh for everyone
    // This ensures all vendors get updated risk assessments monthly
    logger.info(`Processing all ${vendors.length} vendors for monthly refresh`);

    // Batch trigger risk assessment tasks with research enabled for ALL vendors
    // This will:
    // - Create new assessments for vendors without data (v1)
    // - Refresh existing assessments and increment version (v1 -> v2, v2 -> v3, etc.)
    const batch = vendors.map((vendor) => ({
      payload: {
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorWebsite: vendor.website!,
        organizationId: vendor.organizationId,
        createdByUserId: null, // System-initiated
        withResearch: true, // Always do research for monthly refresh
      },
    }));

    try {
      await vendorRiskAssessmentTask.batchTrigger(batch);
      logger.info(`Triggered ${batch.length} vendor risk assessment tasks`, {
        totalVendors: vendors.length,
        triggered: batch.length,
      });

      return {
        success: true,
        totalVendors: vendors.length,
        triggered: batch.length,
        message: `Triggered monthly refresh for ${batch.length} vendors`,
      };
    } catch (error) {
      logger.error('Failed to trigger batch risk assessment tasks', {
        error: error instanceof Error ? error.message : String(error),
        batchSize: batch.length,
      });

      return {
        success: false,
        totalVendors: vendors.length,
        triggered: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});


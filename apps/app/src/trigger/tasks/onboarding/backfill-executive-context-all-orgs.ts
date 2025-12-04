import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { backfillExecutiveContextSingleOrg } from './backfill-executive-context-single-org';

export const backfillExecutiveContextAllOrgs = task({
  id: 'backfill-executive-context-all-orgs',
  run: async () => {
    logger.info('Starting executive context backfill for all organizations');

    try {
      // Get all organizations that have completed onboarding
      const organizations = await db.organization.findMany({
        where: {
          onboardingCompleted: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      logger.info(`Found ${organizations.length} organizations to process`);

      if (organizations.length === 0) {
        logger.info('No organizations found, nothing to backfill');
        return {
          success: true,
          organizationsProcessed: 0,
        };
      }

      // Create batch items for processing
      const allBatchItems = organizations.map((org) => ({
        payload: {
          organizationId: org.id,
        },
      }));

      // Split into chunks of 500 (Trigger.dev batch size limit)
      const BATCH_SIZE = 500;
      const batches: (typeof allBatchItems)[] = [];

      for (let i = 0; i < allBatchItems.length; i += BATCH_SIZE) {
        batches.push(allBatchItems.slice(i, i + BATCH_SIZE));
      }

      logger.info(
        `Splitting ${allBatchItems.length} organizations into ${batches.length} batches of max ${BATCH_SIZE} each`,
      );

      // Process each batch
      let totalTriggered = 0;
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(
          `Triggering batch ${i + 1}/${batches.length} with ${batch.length} organizations`,
        );

        try {
          await backfillExecutiveContextSingleOrg.batchTrigger(batch);
          totalTriggered += batch.length;
          logger.info(`Successfully triggered batch ${i + 1}/${batches.length}`);
        } catch (error) {
          logger.error(`Failed to trigger batch ${i + 1}/${batches.length}: ${error}`);
          throw error;
        }
      }

      logger.info(
        `Successfully triggered executive context backfill jobs for ${totalTriggered} organizations across ${batches.length} batches`,
      );

      return {
        success: true,
        organizationsProcessed: totalTriggered,
        totalBatches: batches.length,
      };
    } catch (error) {
      logger.error(`Error during executive context backfill batch trigger: ${error}`);
      throw error;
    }
  },
});

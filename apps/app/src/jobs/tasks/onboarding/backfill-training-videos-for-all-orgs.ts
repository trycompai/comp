import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { backfillTrainingVideosForOrg } from './backfill-training-videos-for-org';

export const backfillTrainingVideosForAllOrgs = task({
  id: 'backfill-training-videos-for-all-orgs',
  run: async () => {
    logger.info('Starting training video completion backfill for all organizations');

    try {
      // Get all organizations
      const organizations = await db.organization.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc', // Process older organizations first
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

      // Log some stats about what we're about to process
      const totalMembers = organizations.reduce((sum, org) => sum + org._count.members, 0);
      logger.info(
        `About to process ${organizations.length} organizations with a total of ${totalMembers} members`,
      );

      // Create batch items for processing
      const allBatchItems = organizations.map((organization) => ({
        payload: {
          organizationId: organization.id,
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
          await backfillTrainingVideosForOrg.batchTrigger(batch);
          totalTriggered += batch.length;
          logger.info(`Successfully triggered batch ${i + 1}/${batches.length}`);
        } catch (error) {
          logger.error(`Failed to trigger batch ${i + 1}/${batches.length}: ${error}`);
          throw error;
        }
      }

      logger.info(
        `Successfully triggered training video backfill jobs for ${totalTriggered} organizations across ${batches.length} batches`,
      );

      return {
        success: true,
        organizationsProcessed: totalTriggered,
        totalBatches: batches.length,
        totalMembers,
      };
    } catch (error) {
      logger.error(`Error during training video backfill batch trigger: ${error}`);
      throw error;
    }
  },
});

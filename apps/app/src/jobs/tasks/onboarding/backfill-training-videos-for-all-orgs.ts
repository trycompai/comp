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
      const batchItems = organizations.map((organization) => ({
        payload: {
          organizationId: organization.id,
        },
      }));

      logger.info(`Triggering batch job for ${batchItems.length} organizations`);

      // Trigger the batch job to process all organizations
      await backfillTrainingVideosForOrg.batchTrigger(batchItems);

      logger.info(
        `Successfully triggered training video backfill jobs for ${organizations.length} organizations`,
      );

      return {
        success: true,
        organizationsProcessed: organizations.length,
        totalMembers,
      };
    } catch (error) {
      logger.error(`Error during training video backfill batch trigger: ${error}`);
      throw error;
    }
  },
});

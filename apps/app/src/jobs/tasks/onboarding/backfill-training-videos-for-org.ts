import { trainingVideos } from '@/lib/data/training-videos';
import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';

export const backfillTrainingVideosForOrg = task({
  id: 'backfill-training-videos-for-org',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { organizationId: string }) => {
    logger.info(`Starting training video backfill for organization ${payload.organizationId}`);

    try {
      // Get all members for this organization
      const members = await db.member.findMany({
        where: {
          organizationId: payload.organizationId,
          deactivated: false,
        },
        select: {
          id: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      logger.info(`Found ${members.length} members in organization ${payload.organizationId}`);

      if (members.length === 0) {
        logger.info(`No members found for organization ${payload.organizationId}, skipping`);
        return {
          success: true,
          organizationId: payload.organizationId,
          membersProcessed: 0,
          recordsCreated: 0,
        };
      }

      let totalRecordsCreated = 0;
      let membersProcessed = 0;
      let membersSkipped = 0;

      // Process each member
      for (const member of members) {
        try {
          logger.info(`Processing member ${member.id} (${member.user.email})`);

          // Check if this member already has any training video completion records
          // (including old video IDs like sat-1, sat-2, etc.)
          const existingRecords = await db.employeeTrainingVideoCompletion.findMany({
            where: {
              memberId: member.id,
            },
            select: {
              videoId: true,
            },
          });

          if (existingRecords.length > 0) {
            const videoIds = existingRecords.map((r) => r.videoId).join(', ');
            logger.info(
              `Member ${member.id} already has ${existingRecords.length} training video completion records (${videoIds}), skipping`,
            );
            membersSkipped++;
            continue;
          }

          // Create training video completion entries for this member
          // Using skipDuplicates to prevent duplicate records
          const result = await db.employeeTrainingVideoCompletion.createMany({
            data: trainingVideos.map((video) => ({
              memberId: member.id,
              videoId: video.id,
            })),
            skipDuplicates: true,
          });

          totalRecordsCreated += result.count;
          membersProcessed++;

          logger.info(
            `Created ${result.count} training video completion records for member ${member.id}`,
          );
        } catch (memberError) {
          logger.error(
            `Failed to process member ${member.id} (${member.user.email}): ${memberError}`,
          );
          // Continue processing other members even if one fails
        }
      }

      logger.info(
        `Completed training video backfill for organization ${payload.organizationId}. ` +
          `Total members: ${members.length}, New records created: ${membersProcessed}, ` +
          `Skipped (already had records): ${membersSkipped}, Records created: ${totalRecordsCreated}`,
      );

      return {
        success: true,
        organizationId: payload.organizationId,
        membersProcessed,
        membersSkipped,
        totalMembers: members.length,
        recordsCreated: totalRecordsCreated,
      };
    } catch (error) {
      logger.error(
        `Error during training video backfill for organization ${payload.organizationId}: ${error}`,
      );
      throw error;
    }
  },
});

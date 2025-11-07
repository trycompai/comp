import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { sendWeeklyTaskDigestEmailTask } from '../email/weekly-task-digest-email';

export const weeklyTaskReminder = schedules.task({
  id: 'weekly-task-reminder',
  cron: '0 9 * * 1', // Every Monday at 9:00 AM UTC
  maxDuration: 1000 * 60 * 10, // 10 minutes
  run: async () => {
    logger.info('Starting weekly task reminder job');

    // Get all organizations
    const organizations = await db.organization.findMany({
      select: {
        id: true,
        name: true,
        members: {
          where: {
            OR: [{ role: { contains: 'owner' } }, { role: { contains: 'admin' } }],
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Found ${organizations.length} organizations to process`);

    // Build email payloads for all admins/owners with TODO tasks
    const emailPayloads = [];

    for (const org of organizations) {
      logger.info(`Processing organization: ${org.name} (${org.id})`);

      // Get all TODO tasks for this organization
      const todoTasks = await db.task.findMany({
        where: {
          organizationId: org.id,
          status: 'todo',
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Skip if no TODO tasks
      if (todoTasks.length === 0) {
        logger.info(`No TODO tasks found for organization ${org.name}`);
        continue;
      }

      logger.info(`Found ${todoTasks.length} TODO tasks for organization ${org.name}`);

      // Build payload for each admin/owner
      for (const member of org.members) {
        if (!member.user.email || !member.user.name) {
          logger.warn(`Skipping member ${member.id} - missing email or name`);
          continue;
        }

        // Skip internal trycomp.ai emails
        if (member.user.email.includes('@trycomp.ai')) {
          logger.info(`Skipping internal email: ${member.user.email}`);
          continue;
        }

        emailPayloads.push({
          payload: {
            email: member.user.email,
            userName: member.user.name,
            organizationName: org.name,
            organizationId: org.id,
            tasks: todoTasks,
          },
        });
      }
    }

    // Batch trigger all emails with concurrency control
    // Trigger.dev has a limit of 500 items per batchTrigger
    if (emailPayloads.length > 0) {
      const BATCH_SIZE = 500;
      const batches = [];

      for (let i = 0; i < emailPayloads.length; i += BATCH_SIZE) {
        batches.push(emailPayloads.slice(i, i + BATCH_SIZE));
      }

      logger.info(`Triggering ${emailPayloads.length} emails in ${batches.length} batch(es)`);

      try {
        for (const batch of batches) {
          await sendWeeklyTaskDigestEmailTask.batchTrigger(batch);
          logger.info(`Triggered batch of ${batch.length} emails`);
        }

        logger.info(`Successfully triggered all ${emailPayloads.length} weekly task digest emails`);
      } catch (error) {
        logger.error(`Failed to trigger batch email sends: ${error}`);

        return {
          success: false,
          timestamp: new Date().toISOString(),
          organizationsProcessed: organizations.length,
          totalAdminsProcessed: emailPayloads.length,
          emailsTriggered: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      organizationsProcessed: organizations.length,
      emailsTriggered: emailPayloads.length,
    };

    logger.info('Weekly task reminder job completed', summary);

    return summary;
  },
});

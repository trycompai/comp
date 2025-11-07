import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { sendWeeklyTaskDigestEmail } from '@trycompai/email/lib/weekly-task-digest';

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

    let totalEmailsSent = 0;
    let totalAdminsProcessed = 0;
    const errors: string[] = [];

    // Process each organization
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

      // Send one email per admin/owner
      for (const member of org.members) {
        if (!member.user.email || !member.user.name) {
          logger.warn(`Skipping member ${member.id} - missing email or name`);
          continue;
        }

        try {
          const result = await sendWeeklyTaskDigestEmail({
            email: member.user.email,
            userName: member.user.name,
            organizationName: org.name,
            organizationId: org.id,
            tasks: todoTasks,
          });

          if (result.success) {
            totalEmailsSent++;
            logger.info(`Sent weekly task digest to ${member.user.email} (${org.name})`);
          } else {
            errors.push(`Failed to send email to ${member.user.email} (${org.name})`);
            logger.error(`Failed to send email to ${member.user.email}`);
          }

          totalAdminsProcessed++;
        } catch (error) {
          const errorMsg = `Error sending email to ${member.user.email} (${org.name}): ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }
    }

    const summary = {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      organizationsProcessed: organizations.length,
      totalAdminsProcessed,
      emailsSent: totalEmailsSent,
      errors: errors.length > 0 ? errors : undefined,
    };

    logger.info('Weekly task reminder job completed', summary);

    return summary;
  },
});

import { db } from '@db';
import { sendTaskReviewNotificationEmail } from '@trycompai/email';
import { logger, schedules } from '@trigger.dev/sdk';

export const taskSchedule = schedules.task({
  id: 'task-schedule',
  cron: '0 */12 * * *', // Every 12 hours
  maxDuration: 1000 * 60 * 10, // 10 minutes
  run: async () => {
    const now = new Date();

    // Find all Done tasks that have a review date and frequency set
    const candidateTasks = await db.task.findMany({
      where: {
        status: 'done',
        reviewDate: {
          not: null,
        },
        frequency: {
          not: null,
        },
      },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
        assignee: {
          include: {
            user: true,
          },
        },
      },
    });

    // Helpers to compute next due date based on frequency
    const addDaysToDate = (date: Date, days: number) => {
      const result = new Date(date.getTime());
      result.setDate(result.getDate() + days);
      return result;
    };

    const addMonthsToDate = (date: Date, months: number) => {
      const result = new Date(date.getTime());
      const originalDayOfMonth = result.getDate();
      result.setMonth(result.getMonth() + months);
      // Handle month rollover (e.g., Jan 31 + 1 month -> Feb 28/29)
      if (result.getDate() < originalDayOfMonth) {
        result.setDate(0);
      }
      return result;
    };

    const overdueTasks = candidateTasks.filter((task) => {
      if (!task.reviewDate || !task.frequency) return false;

      let nextDueDate: Date | null = null;
      switch (task.frequency) {
        case 'daily':
          nextDueDate = addDaysToDate(task.reviewDate, 1);
          break;
        case 'weekly':
          nextDueDate = addDaysToDate(task.reviewDate, 7);
          break;
        case 'monthly':
          nextDueDate = addMonthsToDate(task.reviewDate, 1);
          break;
        case 'quarterly':
          nextDueDate = addMonthsToDate(task.reviewDate, 3);
          break;
        case 'yearly':
          nextDueDate = addMonthsToDate(task.reviewDate, 12);
          break;
        default:
          nextDueDate = null;
      }

      return nextDueDate !== null && nextDueDate <= now;
    });

    logger.info(`Found ${overdueTasks.length} tasks past their computed review deadline`);

    if (overdueTasks.length === 0) {
      return {
        success: true,
        totalTasksChecked: 0,
        updatedTasks: 0,
        message: 'No tasks found past their computed review deadline',
      };
    }

    // Update all overdue tasks to "todo" status
    try {
      const taskIds = overdueTasks.map((task) => task.id);

      const updateResult = await db.task.updateMany({
        where: {
          id: {
            in: taskIds,
          },
        },
        data: {
          status: 'todo',
        },
      });

      

      // Log details about updated tasks
      overdueTasks.forEach((task) => {
        logger.info(
          `Updated task "${task.title}" (${task.id}) from org "${task.organization.name}" - frequency ${task.frequency} - last reviewed ${task.reviewDate?.toISOString()}`,
        );
      });

      logger.info(`Successfully updated ${updateResult.count} tasks to "todo" status`);

      // Build a map of admins by organization for targeted notifications
      const uniqueOrgIds = Array.from(new Set(overdueTasks.map((t) => t.organizationId)));
      const admins = await db.member.findMany({
        where: {
          organizationId: { in: uniqueOrgIds },
          isActive: true,
          // role is a comma-separated string sometimes
          role: { contains: 'admin' },
        },
        include: {
          user: true,
        },
      });

      const adminsByOrgId = new Map<string, { email: string; name: string }[]>();
      admins.forEach((admin) => {
        const email = admin.user?.email;
        if (!email) return;
        const list = adminsByOrgId.get(admin.organizationId) ?? [];
        list.push({ email, name: admin.user.name ?? email });
        adminsByOrgId.set(admin.organizationId, list);
      });

      // Rate limit: 2 emails per second
      const EMAIL_BATCH_SIZE = 2;
      const EMAIL_BATCH_DELAY_MS = 1000;

      // Build a flat list of email jobs
      type EmailJob = {
        email: string;
        name: string;
        task: typeof overdueTasks[number];
      };
      const emailJobs: EmailJob[] = [];

      // Helper to compute next due date again for email content
      const computeNextDueDate = (reviewDate: Date, frequency: string): Date | null => {
        switch (frequency) {
          case 'daily':
            return addDaysToDate(reviewDate, 1);
          case 'weekly':
            return addDaysToDate(reviewDate, 7);
          case 'monthly':
            return addMonthsToDate(reviewDate, 1);
          case 'quarterly':
            return addMonthsToDate(reviewDate, 3);
          case 'yearly':
            return addMonthsToDate(reviewDate, 12);
          default:
            return null;
        }
      };

      for (const task of overdueTasks) {
        const recipients = new Map<string, string>(); // email -> name

        // Assignee (if any)
        const assigneeEmail = task.assignee?.user?.email;
        if (assigneeEmail) {
          recipients.set(assigneeEmail, task.assignee?.user?.name ?? assigneeEmail);
        }

        // Organization admins
        const orgAdmins = adminsByOrgId.get(task.organizationId) ?? [];
        orgAdmins.forEach((a) => recipients.set(a.email, a.name));

        if (recipients.size === 0) {
          logger.info(`No recipients found for task ${task.id} (${task.title})`);
          continue;
        }

        for (const [email, name] of recipients.entries()) {
          emailJobs.push({ email, name, task });
        }
      }

      for (let i = 0; i < emailJobs.length; i += EMAIL_BATCH_SIZE) {
        const batch = emailJobs.slice(i, i + EMAIL_BATCH_SIZE);

        await Promise.all(
          batch.map(async ({ email, name, task }) => {
            try {
              await sendTaskReviewNotificationEmail({
                email,
                userName: name,
                taskName: task.title,
                organizationName: task.organization.name,
                organizationId: task.organizationId,
                taskId: task.id,
              });
              logger.info(`Sent task review notification to ${email} for task ${task.id}`);
            } catch (emailError) {
              logger.error(`Failed to send review email to ${email} for task ${task.id}: ${emailError}`);
            }
          }),
        );

        // Only delay if there are more emails to send
        if (i + EMAIL_BATCH_SIZE < emailJobs.length) {
          await new Promise((resolve) => setTimeout(resolve, EMAIL_BATCH_DELAY_MS));
        }
      }

      return {
        success: true,
        totalTasksChecked: overdueTasks.length,
        updatedTasks: updateResult.count,
        updatedTaskIds: taskIds,
        message: `Updated ${updateResult.count} tasks past their review deadline`,
      };
    } catch (error) {
      logger.error(`Failed to update overdue tasks: ${error}`);

      return {
        success: false,
        totalTasksChecked: overdueTasks.length,
        updatedTasks: 0,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to update tasks past their review deadline',
      };
    }
  },
});



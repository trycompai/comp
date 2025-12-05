import { db } from '@db';
import { Novu } from '@novu/api';
import { logger, schedules } from '@trigger.dev/sdk';

export const taskSchedule = schedules.task({
  id: 'task-schedule',
  machine: 'large-1x',
  cron: '0 */12 * * *', // Every 12 hours
  maxDuration: 1000 * 60 * 10, // 10 minutes
  run: async () => {
    const now = new Date();
    const novu = new Novu({
      secretKey: process.env.NOVU_API_KEY,
    });

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
            id: true,
            name: true,
            members: {
              where: {
                role: { contains: 'owner' },
              },
              select: {
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
        },
        assignee: {
          select: {
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

    // FIle all tasks past their review deadline.
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

    try {
      // Update all overdue tasks to "todo" status
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

      const recipientsMap = new Map<
        string,
        {
          email: string;
          userId: string;
          name: string;
          task: (typeof overdueTasks)[number];
        }
      >();
      const addRecipients = (
        users: Array<{ user: { id: string; email: string; name?: string } }>,
        task: (typeof overdueTasks)[number],
      ) => {
        for (const entry of users) {
          const user = entry.user;
          if (user && user.email && user.id) {
            const key = `${user.id}-${task.id}`;
            if (!recipientsMap.has(key)) {
              recipientsMap.set(key, {
                email: user.email,
                userId: user.id,
                name: user.name ?? '',
                task,
              });
            }
          }
        }
      };

      // Find recipients (org owner and assignee) for each task and add to recipientsMap
      for (const task of overdueTasks) {
        // Org owners
        if (task.organization && Array.isArray(task.organization.members)) {
          addRecipients(task.organization.members, task);
        }
        // Policy assignee
        if (task.assignee) {
          addRecipients([task.assignee], task);
        }
      }

      // Final deduplicated recipients array.
      const recipients = Array.from(recipientsMap.values());
      // Trigger notification for each recipient.
      novu.triggerBulk({
        events: recipients.map((recipient) => ({
          workflowId: 'task-review-required',
          to: {
            subscriberId: `${recipient.userId}-${recipient.task.organizationId}`,
            email: recipient.email,
          },
          payload: {
            email: recipient.email,
            userName: recipient.name,
            taskName: recipient.task.title,
            organizationName: recipient.task.organization.name,
            organizationId: recipient.task.organizationId,
            taskId: recipient.task.id,
            taskUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.trycomp.ai'}/${recipient.task.organizationId}/tasks/${recipient.task.id}`,
          },
        })),
      });

      // Log details about updated tasks
      overdueTasks.forEach((task) => {
        logger.info(
          `Updated task "${task.title}" (${task.id}) from org "${task.organization.name}" - frequency ${task.frequency} - last reviewed ${task.reviewDate?.toISOString()}`,
        );
      });

      logger.info(`Successfully updated ${updateResult.count} tasks to "todo" status`);

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

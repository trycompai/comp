import { db } from '@db';
import { Novu } from '@novu/api';
import { logger, schedules } from '@trigger.dev/sdk';

import { getTargetStatus } from './task-schedule-helpers';

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
        // Include Custom Automations (EvidenceAutomation with isEnabled)
        evidenceAutomations: {
          where: {
            isEnabled: true,
          },
          select: {
            id: true,
            runs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                evaluationStatus: true,
              },
            },
          },
        },
        // Include App Automations (IntegrationCheckRun) - get all runs to group by checkId
        integrationCheckRuns: {
          orderBy: { createdAt: 'desc' },
          select: {
            checkId: true,
            status: true,
            createdAt: true,
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

    // Categorize tasks by their target status using the extracted helper
    const tasksKeptDone = overdueTasks.filter((task) => getTargetStatus(task) === 'done');
    const tasksToTodo = overdueTasks.filter((task) => getTargetStatus(task) === 'todo');
    const tasksToFailed = overdueTasks.filter((task) => getTargetStatus(task) === 'failed');

    logger.info(
      `${tasksToTodo.length} tasks → "todo", ${tasksToFailed.length} tasks → "failed", ${tasksKeptDone.length} tasks kept as "done"`,
    );

    // Log tasks kept as done due to passing automations
    tasksKeptDone.forEach((task) => {
      logger.info(`Task "${task.title}" (${task.id}) kept as "done" - all automations passing`);
    });

    if (tasksToTodo.length === 0 && tasksToFailed.length === 0) {
      return {
        success: true,
        totalTasksChecked: overdueTasks.length,
        updatedToTodo: 0,
        updatedToFailed: 0,
        tasksKeptDone: tasksKeptDone.length,
        message:
          overdueTasks.length === 0
            ? 'No tasks found past their computed review deadline'
            : 'All overdue tasks have passing automations, no status changes needed',
      };
    }

    try {
      // Update tasks to "todo" status (no automations configured)
      const todoTaskIds = tasksToTodo.map((task) => task.id);
      let todoUpdateCount = 0;
      if (todoTaskIds.length > 0) {
        const todoResult = await db.task.updateMany({
          where: { id: { in: todoTaskIds } },
          data: { status: 'todo' },
        });
        todoUpdateCount = todoResult.count;
      }

      // Update tasks to "failed" status (automations failing)
      const failedTaskIds = tasksToFailed.map((task) => task.id);
      let failedUpdateCount = 0;
      if (failedTaskIds.length > 0) {
        const failedResult = await db.task.updateMany({
          where: { id: { in: failedTaskIds } },
          data: { status: 'failed' },
        });
        failedUpdateCount = failedResult.count;
      }

      // Combine all updated tasks for notifications
      const allUpdatedTasks = [...tasksToTodo, ...tasksToFailed];
      const taskIds = allUpdatedTasks.map((task) => task.id);

      const recipientsMap = new Map<
        string,
        {
          email: string;
          userId: string;
          name: string;
          task: (typeof allUpdatedTasks)[number];
        }
      >();
      const addRecipients = (
        users: Array<{ user: { id: string; email: string; name?: string } }>,
        task: (typeof allUpdatedTasks)[number],
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
      for (const task of allUpdatedTasks) {
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
      tasksToTodo.forEach((task) => {
        logger.info(
          `Updated task "${task.title}" (${task.id}) to "todo" - no automations - org "${task.organization.name}" - frequency ${task.frequency}`,
        );
      });
      tasksToFailed.forEach((task) => {
        logger.info(
          `Updated task "${task.title}" (${task.id}) to "failed" - automations failing - org "${task.organization.name}" - frequency ${task.frequency}`,
        );
      });

      logger.info(
        `Successfully updated ${todoUpdateCount} tasks to "todo" and ${failedUpdateCount} tasks to "failed"`,
      );

      return {
        success: true,
        totalTasksChecked: overdueTasks.length,
        updatedToTodo: todoUpdateCount,
        updatedToFailed: failedUpdateCount,
        updatedTaskIds: taskIds,
        tasksKeptDone: tasksKeptDone.length,
        message: `Updated ${todoUpdateCount} to "todo", ${failedUpdateCount} to "failed" (${tasksKeptDone.length} kept as done)`,
      };
    } catch (error) {
      logger.error(`Failed to update overdue tasks: ${error}`);

      return {
        success: false,
        totalTasksChecked: overdueTasks.length,
        updatedToTodo: 0,
        updatedToFailed: 0,
        tasksKeptDone: 0,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to update tasks past their review deadline',
      };
    }
  },
});

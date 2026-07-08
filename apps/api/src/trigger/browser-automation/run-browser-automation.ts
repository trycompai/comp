import { db } from '@db';
import { logger, tags, task } from '@trigger.dev/sdk';
import { BrowserbaseService } from '../../browserbase/browserbase.service';
import { triggerEmail } from '../../email/trigger-email';
import { TaskStatusChangedEmail } from '../../email/templates/task-status-changed';
import { isUserUnsubscribed } from '@trycompai/email';

const browserbaseService = new BrowserbaseService();

const browserAutomationConcurrencyLimit = (): number => {
  const parsed = Number.parseInt(
    process.env.BROWSER_AUTOMATION_GLOBAL_CONCURRENCY ?? '20',
    10,
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
};

export function shouldMarkTaskDoneAfterBrowserRun(input: {
  screenshotUrl?: string;
  evaluationCriteria?: string | null;
  evaluationStatus?: 'pass' | 'fail';
}): boolean {
  if (!input.screenshotUrl) return false;
  const criteria = input.evaluationCriteria?.trim();
  if (!criteria) return true;
  return input.evaluationStatus === 'pass';
}

/**
 * Send email notifications for task status change
 */
async function sendTaskStatusChangeEmails(params: {
  organizationId: string;
  taskId: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: 'done' | 'failed';
}) {
  const { organizationId, taskId, taskTitle, oldStatus, newStatus } = params;

  try {
    // Get organization, task assignee, and org owners
    // Internal (platform-operated) orgs treat platform admins as real members,
    // so they should also receive task notifications. Resolve before building
    // the member query since the where-clause depends on it.
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, isInternal: true },
    });
    const orgIsInternal = organization?.isInternal ?? false;
    const [task, allMembers] = await Promise.all([
      db.task.findUnique({
        where: { id: taskId },
        select: {
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
      }),
      db.member.findMany({
        where: {
          organizationId,
          deactivated: false,
          ...(orgIsInternal ? {} : { user: { role: { not: 'admin' } } }),
        },
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const organizationName = organization?.name ?? 'your organization';
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.BETTER_AUTH_URL ||
      'https://app.trycomp.ai';
    const taskUrl = `${appUrl}/${organizationId}/tasks/${taskId}`;

    // Filter for admins/owners
    const adminMembers = allMembers.filter(
      (member) =>
        member.role &&
        (member.role.includes('admin') || member.role.includes('owner')),
    );

    // Build recipient list: assignee + admins
    const recipientMap = new Map<
      string,
      { id: string; name: string; email: string }
    >();

    // Add assignee
    if (task?.assignee?.user?.id && task.assignee.user.email) {
      recipientMap.set(task.assignee.user.id, {
        id: task.assignee.user.id,
        name:
          task.assignee.user.name?.trim() ||
          task.assignee.user.email?.trim() ||
          'User',
        email: task.assignee.user.email,
      });
    }

    // Add admin members
    for (const member of adminMembers) {
      if (member.user?.id && member.user.email) {
        recipientMap.set(member.user.id, {
          id: member.user.id,
          name: member.user.name?.trim() || member.user.email?.trim() || 'User',
          email: member.user.email,
        });
      }
    }

    const recipients = Array.from(recipientMap.values());

    // Send emails to each recipient
    await Promise.allSettled(
      recipients.map(async (recipient) => {
        // Check if user is unsubscribed
        const isUnsubscribed = await isUserUnsubscribed(
          db,
          recipient.email,
          'taskAssignments',
          organizationId,
        );

        if (isUnsubscribed) {
          logger.info(
            `Skipping notification: user ${recipient.email} is unsubscribed from task assignments`,
          );
          return;
        }

        try {
          await triggerEmail({
            to: recipient.email,
            subject: `Task "${taskTitle}" status changed to ${newStatus}`,
            react: TaskStatusChangedEmail({
              toName: recipient.name,
              toEmail: recipient.email,
              taskTitle,
              oldStatus: oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1),
              newStatus: newStatus === 'failed' ? 'Failed' : 'Done',
              changedByName: 'Automation',
              organizationName,
              taskUrl,
            }),
            system: true,
          });

          logger.info(`Status change email sent to ${recipient.email}`);
        } catch (error) {
          logger.error(
            `Failed to send status change email to ${recipient.email}`,
            {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          );
        }
      }),
    );

    logger.info(
      `Sent ${recipients.length} status change notifications for task ${taskId} (status: ${newStatus})`,
    );
  } catch (error) {
    logger.error('Failed to send task status change emails', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Worker task that runs a single browser automation.
 * Triggered by the orchestrator (browser-automations-schedule).
 */
export const runBrowserAutomation = task({
  id: 'run-browser-automation',
  maxDuration: 60 * 10, // 10 minutes per automation — Trigger.dev maxDuration is in SECONDS
  queue: {
    concurrencyLimit: browserAutomationConcurrencyLimit(),
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: {
    automationId: string;
    automationName: string;
    organizationId: string;
    taskId: string;
  }) => {
    const { automationId, automationName, organizationId, taskId } = payload;

    await tags.add([`org:${organizationId}`]);

    logger.info(`Running browser automation "${automationName}"`, {
      automationId,
      organizationId,
      taskId,
    });

    // Verify automation exists and is enabled
    const automation = await db.browserAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      logger.error(`Automation not found: ${automationId}`);
      return { success: false, error: 'Automation not found' };
    }

    if (!automation.isEnabled) {
      logger.info(`Automation ${automationId} is disabled, skipping`);
      return { success: false, error: 'Automation is disabled', skipped: true };
    }

    // Get task details for email notifications
    const taskDetails = await db.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });
    const taskTitle = taskDetails?.title ?? 'Unknown Task';

    // Run the automation
    const result = await browserbaseService.runBrowserAutomation(
      automationId,
      organizationId,
    );

    if (result.success) {
      logger.info(`Automation ${automationId} completed successfully`, {
        runId: result.runId,
        screenshotUrl: result.screenshotUrl ? 'captured' : 'none',
      });

      if (
        shouldMarkTaskDoneAfterBrowserRun({
          screenshotUrl: result.screenshotUrl,
          evaluationCriteria: automation.evaluationCriteria,
          evaluationStatus: result.evaluationStatus,
        })
      ) {
        const currentTask = await db.task.findUnique({
          where: { id: taskId },
          select: { status: true, frequency: true },
        });

        if (currentTask && currentTask.status !== 'done') {
          let reviewDate: Date | undefined;
          if (currentTask.frequency) {
            reviewDate = new Date();
            switch (currentTask.frequency) {
              case 'monthly':
                reviewDate.setMonth(reviewDate.getMonth() + 1);
                break;
              case 'quarterly':
                reviewDate.setMonth(reviewDate.getMonth() + 3);
                break;
              case 'yearly':
                reviewDate.setFullYear(reviewDate.getFullYear() + 1);
                break;
            }
          }

          await db.task.update({
            where: { id: taskId },
            data: {
              status: 'done',
              ...(reviewDate ? { reviewDate } : {}),
            },
          });

          logger.info(`Task ${taskId} marked as done`);
        }
      }
    } else {
      logger.error(`Automation ${automationId} failed`, {
        runId: result.runId,
        error: result.error,
        needsReauth: result.needsReauth,
        evaluationStatus: result.evaluationStatus,
      });

      // Mark task as failed if auth issue
      if (result.needsReauth) {
        // Get current status before updating
        const taskBeforeUpdate = await db.task.findUnique({
          where: { id: taskId },
          select: { status: true },
        });
        const oldStatus = taskBeforeUpdate?.status ?? 'todo';

        await db.task.update({
          where: { id: taskId },
          data: { status: 'failed' },
        });

        // Only send email notifications if status actually changed
        if (oldStatus !== 'failed') {
          await sendTaskStatusChangeEmails({
            organizationId,
            taskId,
            taskTitle,
            oldStatus,
            newStatus: 'failed',
          });
        } else {
          logger.info(
            `Skipping notification: task ${taskId} was already in failed status`,
          );
        }
      }
    }

    // Record a successful run on the automation so the orchestrator's
    // schedule filter (`isDueToday`) can skip it on the next tick. "Executed"
    // here means the automation actually ran — including runs whose evaluation
    // legitimately returned `fail`. We skip the write when the automation
    // genuinely couldn't execute (e.g. `needsReauth` / missing browser context
    // / other transient infra errors) so the next orchestrator tick retries
    // instead of waiting a full schedule period.
    const executed =
      result.success === true || result.evaluationStatus === 'fail';

    if (executed) {
      await db.browserAutomation.update({
        where: { id: automationId },
        data: { lastRunAt: new Date() },
      });
    }

    return {
      success: result.success,
      runId: result.runId,
      screenshotUrl: result.screenshotUrl,
      error: result.error,
      needsReauth: result.needsReauth,
      failureCode: result.failureCode,
    };
  },
});

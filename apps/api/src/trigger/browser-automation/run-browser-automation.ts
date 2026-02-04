import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { BrowserbaseService } from '../../browserbase/browserbase.service';
import { sendEmail } from '../../email/resend';
import { TaskStatusChangedEmail } from '../../email/templates/task-status-changed';

const browserbaseService = new BrowserbaseService();

/**
 * Send email notifications for task status change
 */
async function sendTaskStatusChangeEmails(params: {
  organizationId: string;
  taskId: string;
  taskTitle: string;
  newStatus: 'done' | 'failed';
}) {
  const { organizationId, taskId, taskTitle, newStatus } = params;

  try {
    // Get organization, task assignee, and org owners
    const [organization, task, allMembers] = await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
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
    const appUrl = process.env.BASE_URL || 'https://app.trycomp.ai';
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
        try {
          await sendEmail({
            to: recipient.email,
            subject: `Task "${taskTitle}" status changed to ${newStatus}`,
            react: TaskStatusChangedEmail({
              toName: recipient.name,
              toEmail: recipient.email,
              taskTitle,
              oldStatus: 'done',
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
  maxDuration: 1000 * 60 * 10, // 10 minutes per automation
  queue: {
    concurrencyLimit: 80,
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

    // Check if org has browser context
    const context = await browserbaseService.getOrgContext(organizationId);
    if (!context) {
      logger.error(`No browser context for org ${organizationId}`);

      // Create a failed run record
      await db.browserAutomationRun.create({
        data: {
          automationId,
          status: 'failed',
          startedAt: new Date(),
          completedAt: new Date(),
          error: 'No browser context. Please connect your browser in settings.',
        },
      });

      return {
        success: false,
        error: 'No browser context',
        needsReauth: true,
      };
    }

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

      // Update task status to done if screenshot was captured
      if (result.screenshotUrl) {
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
      });

      // Mark task as failed if auth issue
      if (result.needsReauth) {
        await db.task.update({
          where: { id: taskId },
          data: { status: 'failed' },
        });

        // Send email notifications
        await sendTaskStatusChangeEmails({
          organizationId,
          taskId,
          taskTitle,
          newStatus: 'failed',
        });
      }
    }

    return {
      success: result.success,
      runId: result.runId,
      screenshotUrl: result.screenshotUrl,
      error: result.error,
      needsReauth: result.needsReauth,
    };
  },
});

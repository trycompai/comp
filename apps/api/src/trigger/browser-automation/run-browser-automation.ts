import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { BrowserbaseService } from '../../browserbase/browserbase.service';

const browserbaseService = new BrowserbaseService();

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

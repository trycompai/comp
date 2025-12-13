import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { runBrowserAutomation } from './run-browser-automation';

/**
 * Daily scheduled task (orchestrator) that finds all enabled browser automations
 * and triggers individual runs for each.
 */
export const browserAutomationsSchedule = schedules.task({
  id: 'browser-automations-schedule',
  cron: '0 5 * * *', // Daily at 5:00 AM UTC
  maxDuration: 1000 * 60 * 30, // 30 minutes
  run: async (payload) => {
    logger.info('Starting daily browser automations orchestrator', {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    // Find all enabled browser automations
    const automations = await db.browserAutomation.findMany({
      where: { isEnabled: true },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            organizationId: true,
          },
        },
      },
    });

    if (automations.length === 0) {
      logger.info('No enabled browser automations found');
      return { success: true, automationsTriggered: 0 };
    }

    logger.info(`Found ${automations.length} enabled browser automations`);

    // Build payloads for batch triggering
    const triggerPayloads = automations.map((automation) => ({
      payload: {
        automationId: automation.id,
        automationName: automation.name,
        organizationId: automation.task.organizationId,
        taskId: automation.taskId,
      },
    }));

    // Trigger in batches of 500
    const BATCH_SIZE = 500;
    let totalTriggered = 0;

    try {
      for (let i = 0; i < triggerPayloads.length; i += BATCH_SIZE) {
        const batch = triggerPayloads.slice(i, i + BATCH_SIZE);
        await runBrowserAutomation.batchTrigger(batch);
        totalTriggered += batch.length;

        logger.info(
          `Triggered batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} automations`,
        );
      }

      logger.info(`Triggered ${totalTriggered} browser automation runs`);

      return {
        success: true,
        automationsTriggered: totalTriggered,
      };
    } catch (error) {
      logger.error('Failed to trigger browser automations', {
        error: error instanceof Error ? error.message : String(error),
        triggeredBeforeError: totalTriggered,
      });

      return {
        success: false,
        automationsTriggered: totalTriggered,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

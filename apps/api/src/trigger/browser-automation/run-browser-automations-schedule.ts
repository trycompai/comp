import { db, TaskFrequency } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { runBrowserAutomation } from './run-browser-automation';
import { isDueToday } from '../shared/is-due-today';

/**
 * Pure helper extracted for unit testing. Filters a list of candidate
 * automations down to those whose schedule says they are due at `now`.
 *
 * Kept in-memory (Shape A from the plan) because the single source of truth
 * for schedule math is `isDueToday`; duplicating it in SQL would create drift.
 */
export function filterDueAutomations<
  T extends {
    scheduleFrequency: TaskFrequency;
    lastRunAt: Date | null;
  },
>({ automations, now }: { automations: T[]; now: Date }): T[] {
  return automations.filter((a) =>
    isDueToday({
      scheduleFrequency: a.scheduleFrequency,
      lastRunAt: a.lastRunAt,
      now,
    }),
  );
}

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

    const now = new Date();

    // Find all enabled browser automations
    const candidateAutomations = await db.browserAutomation.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        name: true,
        taskId: true,
        scheduleFrequency: true,
        lastRunAt: true,
        task: {
          select: {
            id: true,
            title: true,
            organizationId: true,
          },
        },
      },
    });

    if (candidateAutomations.length === 0) {
      logger.info('No enabled browser automations found');
      return { success: true, automationsTriggered: 0 };
    }

    logger.info(
      `Found ${candidateAutomations.length} enabled browser automations`,
    );

    // Filter by the automation's schedule. `lastRunAt` is only written when
    // the automation actually executed (including legitimate 'fail' verdicts)
    // inside `runBrowserAutomation`, so infra-level failures naturally retry
    // on the next orchestrator tick (the "crude retry" behavior).
    const automations = filterDueAutomations({
      automations: candidateAutomations,
      now,
    });

    if (automations.length < candidateAutomations.length) {
      logger.info(
        `Skipped ${candidateAutomations.length - automations.length} automation(s) not due yet`,
      );
    }

    if (automations.length === 0) {
      logger.info('No browser automations due today');
      return { success: true, automationsTriggered: 0 };
    }

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

import { getManifest } from '@comp/integration-platform';
import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { runTaskIntegrationChecks } from './run-task-integration-checks';

/**
 * Daily scheduled task (orchestrator) that finds all tasks with integration checks
 * and triggers individual check runs for each.
 */
export const integrationChecksSchedule = schedules.task({
  id: 'integration-checks-schedule',
  cron: '0 6 * * *', // Daily at 6:00 AM UTC
  maxDuration: 1000 * 60 * 60, // 1 hour
  run: async (payload) => {
    logger.info('Starting daily integration checks orchestrator', {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    // Get all active integration connections
    const activeConnections = await db.integrationConnection.findMany({
      where: { status: 'active' },
      include: {
        provider: true,
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (activeConnections.length === 0) {
      logger.info('No active integration connections found');
      return { success: true, tasksTriggered: 0 };
    }

    logger.info(`Found ${activeConnections.length} active connections`);

    // For each connection, find tasks that have checks mapped to them
    const tasksToRun: Array<{
      taskId: string;
      taskTitle: string;
      connectionId: string;
      providerSlug: string;
      organizationId: string;
      checkIds: string[];
    }> = [];

    for (const connection of activeConnections) {
      const manifest = getManifest(connection.provider.slug);

      if (!manifest?.checks || manifest.checks.length === 0) {
        continue;
      }

      // Get task template IDs that this integration's checks map to
      const taskTemplateIds = manifest.checks
        .map((c) => c.taskMapping)
        .filter((id): id is NonNullable<typeof id> => !!id);

      if (taskTemplateIds.length === 0) {
        continue;
      }

      // Find tasks in this org that match these templates
      const tasks = await db.task.findMany({
        where: {
          organizationId: connection.organizationId,
          taskTemplateId: { in: taskTemplateIds as string[] },
        },
        select: {
          id: true,
          title: true,
          taskTemplateId: true,
        },
      });

      for (const t of tasks) {
        // Find which checks apply to this task
        const checksForTask = manifest.checks
          .filter((c) => c.taskMapping === t.taskTemplateId)
          .map((c) => c.id);

        if (checksForTask.length > 0) {
          tasksToRun.push({
            taskId: t.id,
            taskTitle: t.title,
            connectionId: connection.id,
            providerSlug: connection.provider.slug,
            organizationId: connection.organizationId,
            checkIds: checksForTask,
          });
        }
      }
    }

    if (tasksToRun.length === 0) {
      logger.info('No tasks with mapped integration checks found');
      return { success: true, tasksTriggered: 0 };
    }

    logger.info(
      `Found ${tasksToRun.length} tasks with integration checks to run`,
    );

    // Trigger in batches of 500
    const BATCH_SIZE = 500;
    const triggerPayloads = tasksToRun.map((t) => ({ payload: t }));
    let totalTriggered = 0;

    try {
      for (let i = 0; i < triggerPayloads.length; i += BATCH_SIZE) {
        const batch = triggerPayloads.slice(i, i + BATCH_SIZE);
        await runTaskIntegrationChecks.batchTrigger(batch);
        totalTriggered += batch.length;

        logger.info(
          `Triggered batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} tasks`,
        );
      }

      logger.info(`Triggered ${totalTriggered} task integration check runs`);

      return {
        success: true,
        tasksTriggered: totalTriggered,
      };
    } catch (error) {
      logger.error('Failed to trigger task integration checks', {
        error: error instanceof Error ? error.message : String(error),
        triggeredBeforeError: totalTriggered,
      });

      return {
        success: false,
        tasksTriggered: totalTriggered,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

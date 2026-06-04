import { getManifest } from '@trycompai/integration-platform';
import { db, TaskFrequency } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { runTaskIntegrationChecks } from './run-task-integration-checks';
import { runDeviceSync } from './run-device-sync';
import { parseDisabledTaskChecks } from '../../integration-platform/utils/disabled-task-checks';
import { isDueToday } from '../shared/is-due-today';

/**
 * Pure helper extracted for unit testing. Filters a list of candidate tasks
 * down to those whose schedule says they are due at `now`.
 *
 * Kept in-memory (Shape A from the plan) because the single source of truth
 * for schedule math is `isDueToday`; duplicating it in SQL would create drift.
 */
export function filterDueTasks<
  T extends {
    integrationScheduleFrequency: TaskFrequency;
    integrationLastRunAt: Date | null;
  },
>({ tasks, now }: { tasks: T[]; now: Date }): T[] {
  return tasks.filter((t) =>
    isDueToday({
      scheduleFrequency: t.integrationScheduleFrequency,
      lastRunAt: t.integrationLastRunAt,
      now,
    }),
  );
}

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

    const now = new Date();

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
      const candidateTasks = await db.task.findMany({
        where: {
          organizationId: connection.organizationId,
          taskTemplateId: { in: taskTemplateIds as string[] },
        },
        select: {
          id: true,
          title: true,
          taskTemplateId: true,
          integrationScheduleFrequency: true,
          integrationLastRunAt: true,
        },
      });

      // Filter by the task's integration schedule. `lastRunAt` is only written
      // on success inside `runTaskIntegrationChecks`, so failures naturally
      // retry on the next orchestrator tick (the "crude retry" behavior).
      const tasks = filterDueTasks({ tasks: candidateTasks, now });

      if (tasks.length < candidateTasks.length) {
        logger.info(
          `Skipped ${candidateTasks.length - tasks.length} task(s) not due yet for connection ${connection.id}`,
        );
      }

      // Per-task disabled checks are stored on the connection's metadata so
      // users can disconnect individual checks from individual tasks without
      // tearing down the whole integration. Resolve once per connection.
      const disabledByTask = parseDisabledTaskChecks(connection.metadata);

      for (const t of tasks) {
        const disabledForThisTask = new Set(disabledByTask[t.id] ?? []);

        // Find which checks apply to this task, minus any the user disabled
        const checksForTask = manifest.checks
          .filter(
            (c) =>
              c.taskMapping === t.taskTemplateId &&
              !disabledForThisTask.has(c.id),
          )
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

    // Trigger integration checks in batches
    let totalTriggered = 0;

    if (tasksToRun.length === 0) {
      logger.info('No tasks with mapped integration checks found');
    } else {
      logger.info(
        `Found ${tasksToRun.length} tasks with integration checks to run`,
      );

      const BATCH_SIZE = 500;
      const triggerPayloads = tasksToRun.map((t) => ({ payload: t }));

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
      } catch (error) {
        logger.error('Failed to trigger task integration checks', {
          error: error instanceof Error ? error.message : String(error),
          triggeredBeforeError: totalTriggered,
        });
      }
    }

    // === Device Sync ===
    // Find orgs with deviceSyncProvider set and trigger device sync
    const orgsWithDeviceSync = await db.organization.findMany({
      where: { deviceSyncProvider: { not: null } },
      select: { id: true, deviceSyncProvider: true },
    });

    let deviceSyncsTriggered = 0;
    let deviceSyncFailures = 0;

    for (const org of orgsWithDeviceSync) {
      const connection = await db.integrationConnection.findFirst({
        where: {
          organizationId: org.id,
          status: 'active',
          provider: { slug: org.deviceSyncProvider! },
        },
        select: { id: true },
      });

      if (!connection) {
        logger.warn(
          `No active connection for device sync provider ${org.deviceSyncProvider} in org ${org.id}`,
        );
        continue;
      }

      try {
        await runDeviceSync.trigger({
          organizationId: org.id,
          connectionId: connection.id,
          providerSlug: org.deviceSyncProvider!,
        });
        deviceSyncsTriggered++;
      } catch (error) {
        deviceSyncFailures++;
        logger.error(
          `Failed to trigger device sync for org ${org.id}`,
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
    }

    logger.info(`Triggered ${deviceSyncsTriggered} device syncs`);

    return {
      // Report failure when not every queued task batch was dispatched OR a
      // device-sync dispatch threw, so partial/failed runs aren't masked.
      success: totalTriggered === tasksToRun.length && deviceSyncFailures === 0,
      tasksTriggered: totalTriggered,
      deviceSyncsTriggered,
    };
  },
});

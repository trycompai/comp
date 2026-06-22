import { getManifest } from '@trycompai/integration-platform';
import { db, TaskAutomationStatus, TaskFrequency } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { runTaskIntegrationChecks } from './run-task-integration-checks';
import { runDeviceSync } from './run-device-sync';
import { isCheckDisabledForTask } from '../../integration-platform/utils/disabled-task-checks';
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

/** A provider's check reduced to what the orchestrator needs to schedule it. */
export interface ProviderCheck {
  id: string;
  taskMapping: string | null;
}

/**
 * Resolve a connection's checks from EITHER the static code manifest (the 8
 * built-in integrations, present in the Trigger.dev registry) OR the dynamic
 * (DB-backed) check map for that provider slug.
 *
 * Dynamic integrations are absent from the Trigger.dev manifest registry, so
 * `getManifest` returns undefined for them here and they were silently skipped —
 * the entire reason scheduled checks never ran for them. Falling back to the DB
 * map lets the orchestrator discover their due tasks too. Static manifests win
 * when both exist (matching the registry, which never lets a dynamic manifest
 * override a code one).
 */
export function resolveProviderChecks({
  manifest,
  dynamicChecks,
}: {
  // Loose check shape so a real `IntegrationManifest` (whose `taskMapping` is a
  // literal-union-or-undefined) is accepted; `.map` below normalizes it.
  manifest:
    | { checks?: Array<{ id: string; taskMapping?: string | null }> }
    | undefined;
  dynamicChecks: ProviderCheck[] | undefined;
}): ProviderCheck[] {
  if (manifest?.checks) {
    return manifest.checks.map((c) => ({
      id: c.id,
      taskMapping: c.taskMapping ?? null,
    }));
  }
  return dynamicChecks ?? [];
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

    // Dynamic (DB-backed) integrations are NOT in the Trigger.dev manifest
    // registry, so getManifest() returns undefined for them below. Load their
    // enabled check → task mappings straight from the DB so this orchestrator
    // can discover their due tasks too (their checks are then run on the API
    // server by the worker — see runOnServer in run-task-integration-checks).
    const dynamicIntegrations = await db.dynamicIntegration.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        checks: {
          where: { isEnabled: true },
          select: { checkSlug: true, taskMapping: true },
        },
      },
    });
    const dynamicChecksBySlug = new Map<string, ProviderCheck[]>(
      dynamicIntegrations.map((d) => [
        d.slug,
        d.checks.map((c) => ({ id: c.checkSlug, taskMapping: c.taskMapping })),
      ]),
    );

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
      // Static providers resolve from the code manifest; dynamic ones from the
      // DB map loaded above. Both reduce to the same { id, taskMapping } shape.
      const manifest = getManifest(connection.provider.slug);
      const checks = resolveProviderChecks({
        manifest,
        dynamicChecks: dynamicChecksBySlug.get(connection.provider.slug),
      });

      if (checks.length === 0) {
        continue;
      }

      // Get task template IDs that this integration's checks map to
      const taskTemplateIds = checks
        .map((c) => c.taskMapping)
        .filter((id): id is string => !!id);

      if (taskTemplateIds.length === 0) {
        continue;
      }

      // Find tasks in this org that match these templates. MANUAL tasks are
      // excluded: the scheduler must not auto-run checks (or flip the status) on
      // a task the customer manages manually — mirrors the UI, which hides the
      // automation/checks tab when automationStatus is MANUAL.
      const candidateTasks = await db.task.findMany({
        where: {
          organizationId: connection.organizationId,
          taskTemplateId: { in: taskTemplateIds as string[] },
          automationStatus: { not: TaskAutomationStatus.MANUAL },
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

      for (const t of tasks) {
        // Find which checks apply to this task, minus any the user disabled
        const checksForTask = checks
          .filter(
            (c) =>
              c.taskMapping === t.taskTemplateId &&
              !isCheckDisabledForTask(connection.metadata, t.id, c.id),
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

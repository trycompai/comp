import { getManifest } from '@trycompai/integration-platform';
import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { runTaskIntegrationChecks } from './run-task-integration-checks';
import { runConnectionChecks } from './run-connection-checks';
import { parseDisabledTaskChecks } from '../../integration-platform/utils/disabled-task-checks';

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

    // --- Pass 2: Vendor-linked connection checks ---
    // Find active connections linked to vendors and run their enabled checks.
    const vendorLinkedConnections = activeConnections.filter(
      (c) => c.vendorId != null,
    );

    const vendorChecksToRun: Array<{
      connectionId: string;
      providerSlug: string;
      organizationId: string;
      checkIds: string[];
      skipCheckIds: string[];
    }> = [];

    if (vendorLinkedConnections.length > 0) {
      // Batch-load vendor check configs for all vendor-linked connections
      const vendorConnectionIds = vendorLinkedConnections.map((c) => c.id);
      const disabledConfigs = await db.vendorCheckConfig.findMany({
        where: {
          connectionId: { in: vendorConnectionIds },
          enabled: false,
        },
        select: { connectionId: true, checkId: true },
      });

      const disabledByConnection = new Map<string, Set<string>>();
      for (const cfg of disabledConfigs) {
        if (!disabledByConnection.has(cfg.connectionId)) {
          disabledByConnection.set(cfg.connectionId, new Set());
        }
        disabledByConnection.get(cfg.connectionId)!.add(cfg.checkId);
      }

      for (const connection of vendorLinkedConnections) {
        const manifest = getManifest(connection.provider.slug);
        if (!manifest?.checks || manifest.checks.length === 0) continue;

        const disabled = disabledByConnection.get(connection.id) ?? new Set();
        const enabledCheckIds = manifest.checks
          .filter((c) => !disabled.has(c.id))
          .map((c) => c.id);

        if (enabledCheckIds.length > 0) {
          const disabledCheckIds = [...disabled];
          vendorChecksToRun.push({
            connectionId: connection.id,
            providerSlug: connection.provider.slug,
            organizationId: connection.organizationId,
            checkIds: enabledCheckIds,
            skipCheckIds: disabledCheckIds,
          });
        }
      }

      logger.info(
        `Found ${vendorChecksToRun.length} vendor-linked connections with checks to run`,
      );
    }

    const totalChecks = tasksToRun.length + vendorChecksToRun.length;
    if (totalChecks === 0) {
      logger.info('No tasks or vendor connections with integration checks found');
      return { success: true, tasksTriggered: 0, vendorChecksTriggered: 0 };
    }

    logger.info(
      `Found ${tasksToRun.length} task checks and ${vendorChecksToRun.length} vendor checks to run`,
    );

    // Trigger task checks in batches of 500
    const BATCH_SIZE = 500;
    let totalTasksTriggered = 0;
    let totalVendorChecksTriggered = 0;

    try {
      // Trigger task-based checks
      if (tasksToRun.length > 0) {
        const taskPayloads = tasksToRun.map((t) => ({ payload: t }));
        for (let i = 0; i < taskPayloads.length; i += BATCH_SIZE) {
          const batch = taskPayloads.slice(i, i + BATCH_SIZE);
          await runTaskIntegrationChecks.batchTrigger(batch);
          totalTasksTriggered += batch.length;

          logger.info(
            `Triggered task batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} tasks`,
          );
        }
      }

      // Trigger vendor-linked checks (reuse the same connection checks task)
      if (vendorChecksToRun.length > 0) {
        const vendorPayloads = vendorChecksToRun.map((v) => ({
          payload: {
            connectionId: v.connectionId,
            providerSlug: v.providerSlug,
            organizationId: v.organizationId,
            skipCheckIds: v.skipCheckIds,
          },
        }));
        for (let i = 0; i < vendorPayloads.length; i += BATCH_SIZE) {
          const batch = vendorPayloads.slice(i, i + BATCH_SIZE);
          await runConnectionChecks.batchTrigger(batch);
          totalVendorChecksTriggered += batch.length;

          logger.info(
            `Triggered vendor batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} connections`,
          );
        }
      }

      logger.info(
        `Triggered ${totalTasksTriggered} task checks + ${totalVendorChecksTriggered} vendor checks`,
      );

      return {
        success: true,
        tasksTriggered: totalTasksTriggered,
        vendorChecksTriggered: totalVendorChecksTriggered,
      };
    } catch (error) {
      logger.error('Failed to trigger integration checks', {
        error: error instanceof Error ? error.message : String(error),
        tasksTriggeredBeforeError: totalTasksTriggered,
        vendorChecksTriggeredBeforeError: totalVendorChecksTriggered,
      });

      return {
        success: false,
        tasksTriggered: totalTasksTriggered,
        vendorChecksTriggered: totalVendorChecksTriggered,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

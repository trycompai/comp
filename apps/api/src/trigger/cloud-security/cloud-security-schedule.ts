import { getManifest } from '@comp/integration-platform';
import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { runCloudSecurityScan } from './run-cloud-security-scan';

/**
 * Daily scheduled task that triggers cloud security scans for all active
 * connections that support multiple connections (currently only AWS).
 *
 * These connections use the new integration platform and need their own
 * scheduled scans. Providers without supportsMultipleConnections still use
 * the legacy integration-schedule task.
 *
 * Runs at 5:00 AM UTC daily (same time as legacy integration-schedule).
 */
export const cloudSecuritySchedule = schedules.task({
  id: 'cloud-security-schedule',
  cron: '0 5 * * *', // 5:00 AM UTC daily (same as legacy)
  maxDuration: 1000 * 60 * 30, // 30 minutes for orchestration
  run: async (payload) => {
    logger.info('Starting daily cloud security scan orchestrator', {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    // Find all active connections with their providers
    const allConnections = await db.integrationConnection.findMany({
      where: {
        status: 'active',
      },
      include: {
        provider: {
          select: { slug: true, name: true },
        },
      },
    });

    // Filter to only connections where the manifest has supportsMultipleConnections
    // These are the ones using the new platform (currently only AWS)
    // Providers without this flag still use the legacy integration-schedule
    const cloudConnections = allConnections.filter((connection) => {
      const manifest = getManifest(connection.provider.slug);
      return manifest?.supportsMultipleConnections === true;
    });

    if (cloudConnections.length === 0) {
      logger.info('No active multi-connection cloud connections found');
      return { success: true, connectionsTriggered: 0 };
    }

    logger.info(
      `Found ${cloudConnections.length} active connections with supportsMultipleConnections`,
    );

    // Build payloads for batch trigger
    const triggerPayloads = cloudConnections.map((connection) => {
      const metadata = (connection.metadata || {}) as Record<string, unknown>;
      const connectionName =
        typeof metadata.connectionName === 'string'
          ? metadata.connectionName
          : connection.provider.name;

      return {
        payload: {
          connectionId: connection.id,
          organizationId: connection.organizationId,
          providerSlug: connection.provider.slug,
          connectionName,
        },
      };
    });

    // Trigger scans in batches
    const BATCH_SIZE = 100;
    let totalTriggered = 0;

    try {
      for (let i = 0; i < triggerPayloads.length; i += BATCH_SIZE) {
        const batch = triggerPayloads.slice(i, i + BATCH_SIZE);
        await runCloudSecurityScan.batchTrigger(batch);
        totalTriggered += batch.length;

        logger.info(
          `Triggered batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} scans`,
        );
      }

      logger.info(
        `Successfully triggered ${totalTriggered} cloud security scans`,
      );

      return {
        success: true,
        connectionsTriggered: totalTriggered,
        totalConnections: cloudConnections.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error('Failed to trigger cloud security scans', {
        error: errorMessage,
        triggeredBeforeError: totalTriggered,
      });

      return {
        success: false,
        connectionsTriggered: totalTriggered,
        totalConnections: cloudConnections.length,
        error: errorMessage,
      };
    }
  },
});

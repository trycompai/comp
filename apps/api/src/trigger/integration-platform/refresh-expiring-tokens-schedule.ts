import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { requestValidCredentials } from './ensure-valid-credentials';

// Refresh tokens expiring within the next 24 hours
const REFRESH_LOOKAHEAD_HOURS = 24;

/**
 * Daily scheduled task that proactively refreshes OAuth tokens before they
 * expire. Prevents the "OAuth token expired. Please reconnect" error caused by
 * tokens expiring between scheduled check runs.
 *
 * Runs 1 hour before the daily integration checks (05:00 UTC vs 06:00 UTC) so
 * tokens are always fresh when checks execute.
 */
export const refreshExpiringTokensSchedule = schedules.task({
  id: 'refresh-expiring-tokens-schedule',
  cron: '0 5 * * *', // Daily at 05:00 UTC — 1 hour before integration checks
  maxDuration: 60 * 30, // 30 minutes
  run: async (payload) => {
    logger.info('Starting proactive OAuth token refresh', {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      logger.error('API_URL environment variable is not set — cannot refresh tokens');
      return { refreshed: 0, failed: 0, skipped: 0 };
    }

    const now = new Date();
    const lookaheadMs = REFRESH_LOOKAHEAD_HOURS * 60 * 60 * 1000;
    const expiryThreshold = new Date(now.getTime() + lookaheadMs);

    // Find all active connections and check the expiry of the latest credential
    // version. Older credential versions may exist, so a `some` predicate would
    // incorrectly select connections where an older version is expiring while
    // the latest version is still valid.
    const activeConnections = await db.integrationConnection.findMany({
      where: { status: 'active' },
      include: {
        organization: { select: { id: true, name: true } },
        credentialVersions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { expiresAt: true },
        },
      },
    });

    const expiringConnections = activeConnections.filter((connection) => {
      const expiresAt = connection.credentialVersions[0]?.expiresAt;
      return (
        expiresAt !== undefined &&
        expiresAt !== null &&
        expiresAt <= expiryThreshold &&
        expiresAt > now
      );
    });

    logger.info(`Found ${expiringConnections.length} connections with tokens expiring within ${REFRESH_LOOKAHEAD_HOURS}h`);

    let refreshed = 0;
    let failed = 0;
    let skipped = 0;

    for (const connection of expiringConnections) {
      const expiresAt = connection.credentialVersions[0]?.expiresAt;
      const minutesUntilExpiry = expiresAt
        ? Math.round((expiresAt.getTime() - Date.now()) / 60_000)
        : null;

      logger.info(`Refreshing token for connection ${connection.id}`, {
        organizationId: connection.organizationId,
        organizationName: connection.organization?.name,
        minutesUntilExpiry,
      });

      const result = await requestValidCredentials({
        apiUrl,
        connectionId: connection.id,
        organizationId: connection.organizationId,
        forceRefresh: true,
      });

      if (result.success) {
        refreshed++;
        logger.info(`Successfully refreshed token for connection ${connection.id}`);
      } else {
        failed++;
        logger.warn(`Failed to refresh token for connection ${connection.id}`, {
          error: result.error,
          status: result.status,
        });
      }
    }

    logger.info('Proactive OAuth token refresh complete', {
      total: expiringConnections.length,
      refreshed,
      failed,
      skipped,
    });

    return { refreshed, failed, skipped, total: expiringConnections.length };
  },
});

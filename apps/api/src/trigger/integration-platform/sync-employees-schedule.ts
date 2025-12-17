import { getManifest } from '@comp/integration-platform';
import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';

const API_BASE_URL = process.env.BASE_URL || 'http://localhost:3333';

/**
 * Scheduled task that syncs employees from connected integrations.
 * Runs daily at 7 AM UTC.
 */
export const syncEmployeesSchedule = schedules.task({
  id: 'sync-employees-schedule',
  cron: '0 7 * * *', // Daily at 7:00 AM UTC
  maxDuration: 1000 * 60 * 30, // 30 minutes
  run: async (payload) => {
    logger.info('Starting scheduled employee sync', {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    // Find all organizations that have selected an employee sync provider
    const orgsWithSyncProvider = await db.organization.findMany({
      where: {
        employeeSyncProvider: { not: null },
      },
      select: {
        id: true,
        name: true,
        employeeSyncProvider: true,
      },
    });

    if (orgsWithSyncProvider.length === 0) {
      logger.info('No organizations have selected an employee sync provider');
      return { success: true, syncsTriggered: 0, results: [] };
    }

    // Find the matching active connections for each org's selected provider
    const syncConnections: Array<{
      id: string;
      organizationId: string;
      provider: { slug: string };
      organization: { id: string; name: string };
    }> = [];

    for (const org of orgsWithSyncProvider) {
      const connection = await db.integrationConnection.findFirst({
        where: {
          organizationId: org.id,
          status: 'active',
          provider: {
            slug: org.employeeSyncProvider!,
          },
        },
        include: {
          provider: true,
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      if (connection) {
        const manifest = getManifest(connection.provider.slug);
        if (manifest?.capabilities?.includes('sync')) {
          syncConnections.push(connection);
        }
      } else {
        logger.warn(
          `Organization ${org.name} has sync provider ${org.employeeSyncProvider} but no active connection`,
        );
      }
    }

    if (syncConnections.length === 0) {
      logger.info('No valid sync connections found for selected providers');
      return { success: true, syncsTriggered: 0, results: [] };
    }

    logger.info(
      `Found ${syncConnections.length} organizations with valid sync connections`,
    );

    const results: Array<{
      connectionId: string;
      providerSlug: string;
      organizationId: string;
      organizationName: string;
      success: boolean;
      imported?: number;
      reactivated?: number;
      deactivated?: number;
      skipped?: number;
      error?: string;
    }> = [];

    // Process each sync connection
    for (const conn of syncConnections) {
      const providerSlug = conn.provider.slug;

      logger.info(`Syncing ${providerSlug} for org ${conn.organization.name}`, {
        connectionId: conn.id,
        organizationId: conn.organizationId,
      });

      try {
        // Call the appropriate sync endpoint based on provider
        const syncResult = await syncProvider({
          providerSlug,
          connectionId: conn.id,
          organizationId: conn.organizationId,
        });

        results.push({
          connectionId: conn.id,
          providerSlug,
          organizationId: conn.organizationId,
          organizationName: conn.organization.name,
          success: true,
          imported: syncResult.imported,
          reactivated: syncResult.reactivated,
          deactivated: syncResult.deactivated,
          skipped: syncResult.skipped,
        });

        logger.info(`Sync completed for ${providerSlug}`, {
          connectionId: conn.id,
          imported: syncResult.imported,
          reactivated: syncResult.reactivated,
          deactivated: syncResult.deactivated,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        results.push({
          connectionId: conn.id,
          providerSlug,
          organizationId: conn.organizationId,
          organizationName: conn.organization.name,
          success: false,
          error: errorMessage,
        });

        logger.error(`Sync failed for ${providerSlug}`, {
          connectionId: conn.id,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    logger.info('Employee sync schedule completed', {
      total: results.length,
      success: successCount,
      failed: failureCount,
    });

    return {
      success: failureCount === 0,
      syncsTriggered: results.length,
      successCount,
      failureCount,
      results,
    };
  },
});

interface SyncProviderParams {
  providerSlug: string;
  connectionId: string;
  organizationId: string;
}

interface SyncResult {
  success: boolean;
  imported: number;
  reactivated: number;
  deactivated: number;
  skipped: number;
  errors: number;
}

async function syncProvider(params: SyncProviderParams): Promise<SyncResult> {
  const { providerSlug, connectionId, organizationId } = params;

  // Route to appropriate sync endpoint based on provider
  switch (providerSlug) {
    case 'google-workspace':
      return syncGoogleWorkspace({ connectionId, organizationId });

    case 'rippling':
      return syncRippling({ connectionId, organizationId });

    case 'jumpcloud':
      return syncJumpCloud({ connectionId, organizationId });

    default:
      throw new Error(`No sync handler for provider: ${providerSlug}`);
  }
}

async function syncGoogleWorkspace({
  connectionId,
  organizationId,
}: {
  connectionId: string;
  organizationId: string;
}): Promise<SyncResult> {
  const url = new URL(
    `${API_BASE_URL}/v1/integrations/sync/google-workspace/employees`,
  );
  url.searchParams.set('organizationId', organizationId);
  url.searchParams.set('connectionId', connectionId);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Google Workspace sync failed: ${response.status} - ${errorBody}`,
    );
  }

  const data = await response.json();
  return {
    success: data.success,
    imported: data.imported || 0,
    reactivated: data.reactivated || 0,
    deactivated: data.deactivated || 0,
    skipped: data.skipped || 0,
    errors: data.errors || 0,
  };
}

async function syncRippling({
  connectionId,
  organizationId,
}: {
  connectionId: string;
  organizationId: string;
}): Promise<SyncResult> {
  const url = new URL(
    `${API_BASE_URL}/v1/integrations/sync/rippling/employees`,
  );
  url.searchParams.set('organizationId', organizationId);
  url.searchParams.set('connectionId', connectionId);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Rippling sync failed: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return {
    success: data.success,
    imported: data.imported || 0,
    reactivated: data.reactivated || 0,
    deactivated: data.deactivated || 0,
    skipped: data.skipped || 0,
    errors: data.errors || 0,
  };
}

async function syncJumpCloud({
  connectionId,
  organizationId,
}: {
  connectionId: string;
  organizationId: string;
}): Promise<SyncResult> {
  const url = new URL(
    `${API_BASE_URL}/v1/integrations/sync/jumpcloud/employees`,
  );
  url.searchParams.set('organizationId', organizationId);
  url.searchParams.set('connectionId', connectionId);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`JumpCloud sync failed: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return {
    success: data.success,
    imported: data.imported || 0,
    reactivated: data.reactivated || 0,
    deactivated: data.deactivated || 0,
    skipped: data.skipped || 0,
    errors: data.errors || 0,
  };
}

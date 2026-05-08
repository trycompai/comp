import { db } from '@db';
import { logger, tags, task } from '@trigger.dev/sdk';

const API_BASE_URL = process.env.BASE_URL || 'http://localhost:3333';

/**
 * Trigger.dev task that runs device sync for a single org+connection.
 * Calls the existing API endpoint which handles credential refresh,
 * DSL interpretation, and device processing.
 *
 * Triggered by the daily integration-checks-schedule orchestrator.
 */
export const runDeviceSync = task({
  id: 'run-device-sync',
  maxDuration: 1000 * 60 * 10, // 10 minutes
  run: async (payload: {
    organizationId: string;
    connectionId: string;
    providerSlug: string;
  }) => {
    const { organizationId, connectionId, providerSlug } = payload;

    await tags.add([`org:${organizationId}`]);

    logger.info(`Starting device sync for provider "${providerSlug}"`, {
      connectionId,
      organizationId,
    });

    try {
      const url = new URL(
        `${API_BASE_URL}/v1/integrations/sync/dynamic/${providerSlug}/devices`,
      );
      url.searchParams.set('connectionId', connectionId);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': process.env.SERVICE_TOKEN_TRIGGER!,
          'x-organization-id': organizationId,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(
          `Device sync API call failed: ${response.status} - ${errorBody}`,
        );

        // Mark connection as error if credentials are invalid
        if (response.status === 401) {
          await db.integrationConnection.update({
            where: { id: connectionId },
            data: {
              status: 'error',
              errorMessage:
                'Credentials expired during scheduled device sync. Please reconnect.',
            },
          });
        }

        return {
          success: false,
          error: `Device sync failed: ${response.status} - ${errorBody}`,
        };
      }

      const result = (await response.json()) as {
        success: boolean;
        totalFound: number;
        imported: number;
        updated: number;
        removed: number;
        skipped: number;
        errors: number;
        syncRunId?: string;
      };

      logger.info(`Device sync completed for "${providerSlug}"`, {
        imported: result.imported,
        updated: result.updated,
        removed: result.removed,
        skipped: result.skipped,
        errors: result.errors,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`Device sync failed for "${providerSlug}"`, {
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

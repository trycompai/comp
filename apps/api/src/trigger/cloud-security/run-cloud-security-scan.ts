import { db } from '@db/server';
import { logger, task } from '@trigger.dev/sdk';

/**
 * Trigger task that runs a cloud security scan for a single connection.
 * This is the worker task triggered by the scheduled orchestrator.
 *
 * Following the legacy pattern: catch all errors and return { success: false }
 * instead of throwing. This ensures errors are logged but don't cause noise.
 */
export const runCloudSecurityScan = task({
  id: 'run-cloud-security-scan',
  maxDuration: 1000 * 60 * 15, // 15 minutes (scans can take time for multiple regions)
  run: async (payload: {
    connectionId: string;
    organizationId: string;
    providerSlug: string;
    connectionName: string;
  }) => {
    const { connectionId, organizationId, providerSlug, connectionName } =
      payload;

    logger.info(
      `Starting cloud security scan for connection: ${connectionName}`,
      {
        connectionId,
        provider: providerSlug,
        organizationId,
      },
    );

    try {
      // Verify connection is still active
      const connection = await db.integrationConnection.findUnique({
        where: { id: connectionId },
        select: { id: true, status: true },
      });

      if (!connection) {
        logger.warn(`Connection not found: ${connectionId}`);
        return { success: false, error: 'Connection not found' };
      }

      if (connection.status !== 'active') {
        logger.info(`Skipping inactive connection: ${connectionId}`);
        return {
          success: true,
          skipped: true,
          reason: 'Connection not active',
        };
      }

      // Call the cloud security scan API endpoint
      const apiUrl = process.env.BASE_URL || 'http://localhost:3333';

      const response = await fetch(
        `${apiUrl}/v1/cloud-security/scan/${connectionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': organizationId,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { message?: string }).message ||
          `Scan failed with status: ${response.status}`;

        logger.warn(`Cloud security scan failed for ${connectionName}`, {
          connectionId,
          status: response.status,
          error: errorMessage,
        });

        return { success: false, error: errorMessage };
      }

      const result = (await response.json()) as {
        success: boolean;
        provider: string;
        findingsCount: number;
        scannedAt: string;
      };

      logger.info(`Cloud security scan completed for ${connectionName}`, {
        connectionId,
        provider: result.provider,
        findingsCount: result.findingsCount,
      });

      return {
        success: true,
        provider: result.provider,
        findingsCount: result.findingsCount,
        scannedAt: result.scannedAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`Error running cloud security scan for ${connectionName}`, {
        connectionId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

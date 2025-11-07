import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { sendIntegrationResults } from './integration-results';

export const runIntegrationTests = task({
  id: 'run-integration-tests',
  run: async (payload: { organizationId: string }) => {
    const { organizationId } = payload;

    logger.info(`Running integration tests for organization: ${organizationId}`);

    const integrations = await db.integration.findMany({
      where: {
        organizationId: organizationId,
        integrationId: {
          in: ['aws', 'gcp', 'azure'],
        },
      },
      select: {
        id: true,
        name: true,
        integrationId: true,
        settings: true,
        userSettings: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!integrations || integrations.length === 0) {
      logger.warn(`No integrations found for organization: ${organizationId}`);
      return {
        success: false,
        error: 'No integrations found',
        organizationId,
      };
    }

    logger.info(`Found ${integrations.length} integrations to test for organization: ${organizationId}`);

    const batchItems = integrations.map((integration) => ({
      payload: {
        integration: {
          id: integration.id,
          name: integration.name,
          integration_id: integration.integrationId,
          settings: integration.settings,
          user_settings: integration.userSettings,
          organization: integration.organization,
        },
      },
    }));

    try {
      const batchHandle = await sendIntegrationResults.batchTriggerAndWait(batchItems);

      // Check if any child runs failed
      const failedRuns = batchHandle.runs.filter((run) => !run.ok);

      if (failedRuns.length > 0) {
        const errorMessages = failedRuns
          .map((run) => {
            const errorMsg = run.error instanceof Error ? run.error.message : String(run.error);
            return errorMsg;
          })
          .join('; ');

        logger.error(`Integration tests failed for organization ${organizationId}: ${errorMessages}`);
        throw new Error(errorMessages);
      }

      logger.info(`Successfully completed batch integration tests for organization: ${organizationId}`);

      return {
        success: true,
        organizationId,
        integrationsCount: integrations.length,
        batchHandleId: batchHandle.id,
      };
    } catch (error) {
      logger.error(`Failed to run integration tests for organization ${organizationId}: ${error}`);
      throw error;
    }
  },
});

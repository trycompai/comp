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

    logger.info(
      `Found ${integrations.length} integrations to test for organization: ${organizationId}`,
    );

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

      const failedIntegrations: Array<{
        id: string;
        integrationId: string;
        name: string;
        error: string;
      }> = [];

      batchHandle.runs.forEach((run, index) => {
        const integration = integrations[index];

        if (run.ok) {
          // Check if the task completed but returned success: false
          const runOutput = run.output as { success?: boolean; error?: string } | undefined;

          if (runOutput && runOutput.success === false) {
            failedIntegrations.push({
              id: integration.id,
              integrationId: integration.integrationId,
              name: integration.name,
              error: runOutput.error || 'Integration failed',
            });
          }
        } else {
          // Task crashed or threw an error
          const errorMessage =
            run.error instanceof Error ? run.error.message : String(run.error ?? 'Unknown error');

          failedIntegrations.push({
            id: integration.id,
            integrationId: integration.integrationId,
            name: integration.name,
            error: errorMessage,
          });
        }
      });

      if (failedIntegrations.length > 0) {
        const errorMessages = failedIntegrations.map(({ error }) => error).join('; ');

        logger.warn(
          `Integration tests completed with errors for organization ${organizationId}: ${errorMessages}`,
        );

        return {
          success: false,
          organizationId,
          integrationsCount: integrations.length,
          batchHandleId: batchHandle.id,
          errors: failedIntegrations.map(({ error }) => error),
          failedIntegrations,
        };
      }

      logger.info(
        `Successfully completed batch integration tests for organization: ${organizationId}`,
      );

      return {
        success: true,
        organizationId,
        integrationsCount: integrations.length,
        batchHandleId: batchHandle.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        `Failed to run integration tests for organization ${organizationId}: ${errorMessage}`,
      );

      return {
        success: false,
        organizationId,
        integrationsCount: integrations.length,
        errors: [errorMessage],
      };
    }
  },
});

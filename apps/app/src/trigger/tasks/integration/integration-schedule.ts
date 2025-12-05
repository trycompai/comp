import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { sendIntegrationResults } from './integration-results';

export const sendIntegrationSchedule = schedules.task({
  id: 'integration-schedule',
  cron: '0 5 * * *', // 12:00 AM EST (5:00 AM UTC)
  maxDuration: 1000 * 60 * 10, // 10 minutes
  run: async () => {
    const integrations = await db.integration.findMany({
      select: {
        id: true,
        name: true,
        integrationId: true,
        settings: true,
        userSettings: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    const triggerPayloads = integrations.map((integration) => ({
      payload: {
        integration: {
          id: integration.id,
          name: integration.name,
          integration_id: integration.integrationId,
          settings: integration.settings,
          user_settings: integration.userSettings,
          organization: {
            id: integration.organizationId,
            name: integration.organization.name,
          },
        },
      },
    }));

    if (triggerPayloads.length > 0) {
      try {
        await sendIntegrationResults.batchTrigger(triggerPayloads);

        logger.info(`Triggered ${triggerPayloads.length} integration runs`);
      } catch (error) {
        logger.error(`Failed to trigger batch runs: ${error}`);

        return {
          success: false,
          totalIntegrations: integrations.length,
          triggeredIntegrations: triggerPayloads.length,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      success: true,
      totalIntegrations: integrations.length,
      triggeredIntegrations: triggerPayloads.length,
    };
  },
});

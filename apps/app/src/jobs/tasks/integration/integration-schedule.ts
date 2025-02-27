import { db } from "@bubba/db";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { sendIntegrationResults } from "./integration-results";

export const sendIntegrationSchedule = schedules.task({
  id: "integration-schedule",
  cron: "0 0 * * *",
  run: async () => {
    const now = new Date();
    const upcomingThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    logger.info(
      `Sending integration runs from now: ${now} to ${upcomingThreshold}`,
    );

    const integrations = await db.organizationIntegrations.findMany({
      select: {
        id: true,
        name: true,
        integration_id: true,
        settings: true,
        user_settings: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const triggerPayloads = integrations
      .map(integration => ({
        payload: {
          integration: {
            id: integration.id,
            name: integration.name,
            integration_id: integration.integration_id,
            settings: integration.settings,
            user_settings: integration.user_settings,
            organization: integration.organization,
          }
        }
      }));

    if (triggerPayloads.length > 0) {
      try {
        await sendIntegrationResults.batchTrigger(
          triggerPayloads,
        );

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
  }
});
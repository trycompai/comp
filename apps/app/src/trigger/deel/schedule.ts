import { db } from "@bubba/db";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { syncDeelEmployees } from "./index";

export const deelEmployeeSchedule = schedules.task({
  id: "deel-employee-schedule",
  cron: "0 0 * * *", // Run at midnight every day
  run: async () => {
    logger.info("Starting Deel employee sync schedule");

    const deelIntegrations = await db.organizationIntegrations.findMany({
      where: {
        integration_id: "Deel",
      },
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

    logger.info(
      `Found ${deelIntegrations.length} Deel integrations to process`
    );

    const triggerPayloads = deelIntegrations.map((integration) => ({
      payload: {
        integration: {
          id: integration.id,
          name: integration.name,
          integration_id: integration.integration_id,
          settings: integration.settings as Record<string, any>,
          user_settings: integration.user_settings as Record<string, any>,
          organization: integration.organization,
        },
      },
    }));

    if (triggerPayloads.length > 0) {
      try {
        await syncDeelEmployees.batchTrigger(triggerPayloads);
        logger.info(
          `Triggered ${triggerPayloads.length} Deel employee sync jobs`
        );
      } catch (error) {
        logger.error(`Failed to trigger batch Deel sync jobs: ${error}`);
        return {
          success: false,
          totalIntegrations: deelIntegrations.length,
          triggeredIntegrations: triggerPayloads.length,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } else {
      logger.info("No Deel integrations found to process");
    }

    return {
      success: true,
      totalIntegrations: deelIntegrations.length,
      triggeredIntegrations: triggerPayloads.length,
    };
  },
});

import { decrypt } from '@comp/app/src/lib/encryption';
import { type DecryptFunction, getIntegrationHandler } from '@comp/integrations';
import { db } from '@db';
import { logger, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';

const getAwsRegion = (details: unknown): string | null => {
  if (!details || typeof details !== 'object') {
    return null;
  }
  const metadata = (details as { _metadata?: { region?: string } })._metadata;
  return typeof metadata?.region === 'string' ? metadata.region : null;
};

const formatFindingTitle = (title: string, integrationId: string, region?: string | null) => {
  if (integrationId === 'aws' && region) {
    return `${title} (${region})`;
  }
  return title;
};

export const sendIntegrationResults = schemaTask({
  id: 'send-integration-results',
  schema: z.object({
    integration: z.object({
      id: z.string(),
      name: z.string(),
      integration_id: z.string(),
      settings: z.any(),
      user_settings: z.any(),
      organization: z.object({
        id: z.string(),
        name: z.string(),
      }),
    }),
  }),
  maxDuration: 1000 * 60 * 10, // 10 minutes
  run: async (payload) => {
    const { integration } = payload;

    try {
      // Access the integration_id to determine which integration to run
      const integrationId = integration.integration_id;

      // Get the integration handler with proper typing
      const integrationHandler = getIntegrationHandler(integrationId);

      if (!integrationHandler) {
        logger.error(`Integration handler for ${integrationId} not found`);
        return {
          success: false,
          error: 'Integration handler not found',
        };
      }

      // Extract user settings which may contain necessary credentials
      const userSettings = integration.user_settings as unknown as Record<string, unknown>;
      const normalizedUserSettings = { ...userSettings };

      if (
        integrationId === 'aws' &&
        !('regions' in normalizedUserSettings) &&
        'region' in normalizedUserSettings &&
        normalizedUserSettings.region
      ) {
        normalizedUserSettings.regions = [normalizedUserSettings.region];
      }

      // Process credentials using the integration handler
      const typedCredentials = await integrationHandler.processCredentials(
        normalizedUserSettings,
        // Cast decrypt to match the expected DecryptFunction type
        decrypt as unknown as DecryptFunction,
      );

      let results: Awaited<ReturnType<typeof integrationHandler.fetch>> = [];
      const regionErrors: Array<{ region: string; error: string }> = [];

      // For AWS, fetch each region individually to capture per-region errors
      if (integrationId === 'aws') {
        const regions: string[] = Array.isArray(
          (typedCredentials as { regions?: string[] }).regions,
        )
          ? ((typedCredentials as { regions?: string[] }).regions as string[])
          : [];

        if (regions.length > 0) {
          for (const region of regions) {
            try {
              const regionResults = await integrationHandler.fetch({
                ...(typedCredentials as Record<string, unknown>),
                region,
                regions: [region],
              });
              results.push(...regionResults);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              regionErrors.push({ region, error: errorMessage });
              logger.warn(`AWS fetch failed for region ${region}: ${errorMessage}`);
            }
          }
        } else {
          // Fallback: no regions specified, fetch with default credentials
          results = await integrationHandler.fetch(typedCredentials);
        }
      } else {
        // Non-AWS integrations: fetch once
        results = await integrationHandler.fetch(typedCredentials);
      }

      // If all AWS regions failed, report failure
      if (integrationId === 'aws' && results.length === 0 && regionErrors.length > 0) {
        logger.error(`All AWS regions failed for ${integration.name}`);

        // Still record the region errors
        for (const regionError of regionErrors) {
          await db.integrationResult.create({
            data: {
              title: `${integration.name} (${regionError.region})`,
              description: 'Integration failed to fetch results for this region',
              remediation: 'Check region configuration and IAM permissions',
              status: 'error',
              severity: 'ERROR',
              resultDetails: {
                error: regionError.error,
                region: regionError.region,
              },
              integrationId: integration.id,
              organizationId: integration.organization.id,
              completedAt: new Date(),
            },
          });
        }

        // Update lastRunAt even on failure
        await db.integration.update({
          where: { id: integration.id },
          data: { lastRunAt: new Date() },
        });

        return {
          success: false,
          error: `All ${regionErrors.length} AWS region(s) failed to fetch`,
          regionErrors,
        };
      }

      // Store the integration results using model name that matches the database
      for (const result of results) {
        // First verify the integration exists
        const existingIntegration = await db.integration.findUnique({
          where: { id: integration.id },
        });

        if (!existingIntegration) {
          logger.error(`Integration with ID ${integration.id} not found`);
          continue;
        }

        const region = getAwsRegion(result.resultDetails);
        const formattedTitle = formatFindingTitle(result.title, integrationId, region);

        // Check if a result with the same finding ID already exists
        // Using title as a unique identifier since it's now part of the standard fields
        const existingResult = await db.integrationResult.findFirst({
          where: {
            title: formattedTitle,
            integrationId: existingIntegration.id,
          },
        });

        if (existingResult) {
          // Update the existing result instead of creating a new one
          await db.integrationResult.update({
            where: { id: existingResult.id },
            data: {
              title: formattedTitle,
              description: result.description,
              remediation: result.remediation,
              status: result.status,
              severity: result.severity,
              resultDetails: result.resultDetails,
              completedAt: new Date(),
            },
          });
          continue;
        }

        await db.integrationResult.create({
          data: {
            title: formattedTitle,
            description: result.description,
            remediation: result.remediation,
            status: result.status,
            severity: result.severity,
            resultDetails: result.resultDetails,
            integrationId: existingIntegration.id,
            organizationId: integration.organization.id,
            completedAt: new Date(),
          },
        });
      }

      if (regionErrors.length > 0) {
        for (const regionError of regionErrors) {
          await db.integrationResult.create({
            data: {
              title: `${integration.name} (${regionError.region})`,
              description: 'Integration failed to fetch results for this region',
              remediation: 'Check region configuration and IAM permissions',
              status: 'error',
              severity: 'ERROR',
              resultDetails: {
                error: regionError.error,
                region: regionError.region,
              },
              integrationId: integration.id,
              organizationId: integration.organization.id,
              completedAt: new Date(),
            },
          });
        }
      }

      // Update the integration's lastRunAt timestamp
      await db.integration.update({
        where: { id: integration.id },
        data: { lastRunAt: new Date() },
      });

      logger.info(`Integration run completed for ${integration.name}`);
      return { success: true, totalResults: results.length, results };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error running integration: ${errorMessage}`);

      // Record the failure using model name that matches the database
      try {
        await db.integrationResult.create({
          data: {
            title: `${integration.name} Security Check`,
            description: 'Integration failed to run',
            remediation: 'Please check the integration configuration and try again',
            status: 'error',
            severity: 'ERROR',
            resultDetails: {
              error: errorMessage,
            },
            integrationId: integration.id,
            organizationId: integration.organization.id,
          },
        });
      } catch (createError) {
        logger.error(`Failed to create error record: ${createError}`);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

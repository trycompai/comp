import { db } from "@bubba/db";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";


import {
  SecurityHubClient,
  GetFindingsCommand,
  SecurityHubClientConfig,
  GetFindingsCommandInput,
  GetFindingsCommandOutput
} from "@aws-sdk/client-securityhub";

/**
 * Fetches security findings from AWS Security Hub
 * @returns Promise containing an array of findings
 */
async function fetchSecurityFindings(AWS_REGION: string, AWS_ACCESS_KEY_ID: string, AWS_SECRET_ACCESS_KEY: string, AWS_SESSION_TOKEN: string): Promise<any[]> {
  try {
    // 1. Configure the SecurityHub client with AWS credentials
    // For production, prefer using environment variables or AWS credential profiles rather than hardcoding
    const config: SecurityHubClientConfig = { 
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        sessionToken: AWS_SESSION_TOKEN // Required for temporary credentials
      }
    };
    const securityHubClient = new SecurityHubClient(config);


    // 2. Define filters for the findings we want to retrieve.
    // Example: get only NEW (unresolved) findings for failed compliance controls.
    const params: GetFindingsCommandInput = {
      Filters: {
        WorkflowStatus: [{ Value: "NEW", Comparison: "EQUALS" }],       // only active findings
        ComplianceStatus: [{ Value: "FAILED", Comparison: "EQUALS" }]  // only failed control checks
      },
      MaxResults: 100  // adjust page size as needed (max 100)
    };

    let command = new GetFindingsCommand(params);
    let response: GetFindingsCommandOutput = await securityHubClient.send(command);

    let allFindings: any[] = response.Findings || [];
    let nextToken = response.NextToken;

    // 3. Loop to paginate through all results if there are more than 100 findings
    while (nextToken) {
      const nextPageParams: GetFindingsCommandInput = { ...params, NextToken: nextToken };
      response = await securityHubClient.send(new GetFindingsCommand(nextPageParams));
      
      if (response.Findings) {
        allFindings.push(...response.Findings);
      }
      
      nextToken = response.NextToken;
    }

    console.log(`Retrieved ${allFindings.length} findings`);
    return allFindings;
  } catch (error) {
    console.error("Error fetching Security Hub findings:", error);
    throw error;
  }
}

export const sendIntegrationResults = schemaTask({
  id: "send-integration-results",
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
  run: async (payload) => {
    const { integration } = payload;

    try {
      // Access the integration_id to determine which integration to run
      const integrationId = integration.integration_id;
      
      // Extract user settings which may contain necessary credentials
      const userSettings = integration.user_settings;
      
      let results = null;
      
      // Handle specific integrations using explicit case matching
      if (1) {
//      if (integrationId === 'Aws') {

        if (1) {
          results = await fetchSecurityFindings(
            'w',
            'x',
            'y',
            'z'
          );

          // Store the integration results using model name that matches the database
          for (const result of results) {
            // First verify the integration exists
            const existingIntegration = await db.organizationIntegrations.findUnique({
              where: { id: integration.id }
            });
            
            if (!existingIntegration) {
              logger.error(`Integration with ID ${integration.id} not found`);
              continue;
            }
            
            await db.organizationIntegrationResults.create({
              data: {
                title: result?.Title,
                status: result?.Compliance?.Status || 'unknown',
                label: result?.Severity?.Label || 'INFO',
                resultDetails: result || { error: "No result returned" },
                organizationIntegrationId: existingIntegration.id,
                organizationId: integration.organization.id,
                // assignedUserId is now optional, so we don't need to provide it
              }
            });
          }
          
          logger.info(`Integration run completed for ${integration.name}`);
          return { success: true };
        } else {
          logger.warn(`Integration ${integrationId} does not have a fetchSecurityFindings method`);
        }
      } else {
        logger.warn(`Integration ${integrationId} not found or not supported`);
      }
      
      return { success: false, error: "Integration not configured correctly" };
    } catch (error) {
      logger.error(`Error running integration: ${error}`);
      
      // Record the failure using model name that matches the database
      try {
        
        await db.organizationIntegrationResults.create({
          data: {
            title: `${integration.name} Security Check`,
            status: 'error',
            label: 'ERROR',
            resultDetails: { error: error instanceof Error ? error.message : String(error) },
            organizationIntegrationId: integration.integration_id,
            organizationId: integration.organization.id,
            // assignedUserId is now optional, so we don't need to provide it
          }
        });
      } catch (createError) {
        logger.error(`Failed to create error record: ${createError}`);
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  },
});

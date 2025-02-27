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

// Export the function for use in other modules
export { fetchSecurityFindings };
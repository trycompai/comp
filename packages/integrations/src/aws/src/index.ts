import { SecurityHubClient, GetFindingsCommand, SecurityHubClientConfig, GetFindingsCommandInput, GetFindingsCommandOutput } from "@aws-sdk/client-securityhub";

// 1. Configure the SecurityHub client with AWS credentials
// For production, prefer using environment variables or AWS credential profiles rather than hardcoding
const config: SecurityHubClientConfig = { 
  region: process.env.AWS_REGION || "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "" // Required for temporary credentials
  }
};
const securityHubClient = new SecurityHubClient(config);

/**
 * Fetches security findings from AWS Security Hub
 * @returns Promise containing an array of findings
 */
async function fetchSecurityFindings(): Promise<any[]> {
  try {
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

// Usage example
fetchSecurityFindings().then((findings: any[]) => {
  // 4. Process findings
  findings.forEach((finding: any) => {
    console.log(`${finding.Title} - ${finding.Severity?.Label} - ${finding.Compliance?.Status}`);
  });
});

// Export the function for use in other modules
export { fetchSecurityFindings };
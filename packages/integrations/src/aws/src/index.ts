import type {
  GetFindingsCommandInput,
  GetFindingsCommandOutput,
  SecurityHubClientConfig,
} from '@aws-sdk/client-securityhub';
import { GetFindingsCommand, SecurityHubClient } from '@aws-sdk/client-securityhub';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

interface AWSCredentials {
  region: string;
  access_key_id: string;
  secret_access_key: string;
}

interface AWSFinding {
  title: string;
  description: string;
  remediation: string;
  status: string;
  severity: string;
  resultDetails: any;
}

async function assertKeysWork(creds: AWSCredentials) {
  const sts = new STSClient({
    region: creds.region,
    credentials: {
      accessKeyId: creds.access_key_id,
      secretAccessKey: creds.secret_access_key,
    },
  });
  await sts.send(new GetCallerIdentityCommand({})); // throws on bad creds
}

/**
 * Fetches security findings from AWS Security Hub
 * @returns Promise containing an array of findings
 */
async function fetch(credentials: AWSCredentials): Promise<AWSFinding[]> {
  try {
    // 1. Assert that the credentials work
    console.log('Asserting credentials');
    await assertKeysWork(credentials);

    // 2. Configure the SecurityHub client with AWS credentials
    console.log('Configuring SecurityHub client');
    const config: SecurityHubClientConfig = {
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.access_key_id,
        secretAccessKey: credentials.secret_access_key,
      },
    };

    console.log('Configured SecurityHub client');
    const securityHubClient = new SecurityHubClient(config);

    console.log('Created SecurityHub client');

    // 3. Define filters for the findings we want to retrieve.
    const params: GetFindingsCommandInput = {
      Filters: {
        WorkflowStatus: [{ Value: 'NEW', Comparison: 'EQUALS' }], // only active findings
        ComplianceStatus: [{ Value: 'FAILED', Comparison: 'EQUALS' }], // only failed control checks
      },
      MaxResults: 100, // adjust page size as needed (max 100)
    };

    console.log('Defined filters');

    const command = new GetFindingsCommand(params);
    let response: GetFindingsCommandOutput = await securityHubClient.send(command);

    const allFindings: AWSFinding[] = [];

    // 4. Process initial response
    console.log('Processing initial response');
    if (response.Findings) {
      const transformedFindings = response.Findings.map((finding) => ({
        title: finding.Title || 'Untitled Finding',
        description: finding.Description || 'No description available',
        remediation: finding.Remediation?.Recommendation?.Text || 'No remediation available',
        status: finding.Compliance?.Status || 'unknown',
        severity: finding.Severity?.Label || 'INFO',
        resultDetails: finding,
      }));
      allFindings.push(...transformedFindings);
    }

    let nextToken = response.NextToken;

    // 5. Continue pagination if there are more results
    console.log('Continuing pagination');
    while (nextToken) {
      const nextPageParams: GetFindingsCommandInput = {
        ...params,
        NextToken: nextToken,
      };
      response = await securityHubClient.send(new GetFindingsCommand(nextPageParams));

      if (response.Findings) {
        const transformedFindings = response.Findings.map((finding) => ({
          title: finding.Title || 'Untitled Finding',
          description: finding.Description || 'No description available',
          remediation: finding.Remediation?.Recommendation?.Text || 'No remediation available',
          status: finding.Compliance?.Status || 'unknown',
          severity: finding.Severity?.Label || 'INFO',
          resultDetails: finding,
        }));
        allFindings.push(...transformedFindings);
      }

      nextToken = response.NextToken;
    }

    return allFindings;
  } catch (error) {
    console.error('Error fetching Security Hub findings:', error);
    throw error;
  }
}

// Export the function and types for use in other modules
export { fetch };
export type { AWSCredentials, AWSFinding };

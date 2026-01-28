import type {
  GetFindingsCommandInput,
  GetFindingsCommandOutput,
  SecurityHubClientConfig,
} from '@aws-sdk/client-securityhub';
import { GetFindingsCommand, SecurityHubClient } from '@aws-sdk/client-securityhub';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

interface AWSCredentials {
  region?: string;
  regions?: string[];
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

async function assertKeysWork(creds: AWSCredentials, region: string) {
  const sts = new STSClient({
    region,
    credentials: {
      accessKeyId: creds.access_key_id,
      secretAccessKey: creds.secret_access_key,
    },
  });
  const identity = await sts.send(new GetCallerIdentityCommand({})); // throws on bad creds
  return identity.Account ?? 'unknown';
}

const resolveRegions = (credentials: AWSCredentials): string[] => {
  if (credentials.regions && credentials.regions.length > 0) {
    return credentials.regions;
  }
  if (credentials.region) {
    return [credentials.region];
  }
  return [];
};

const buildFinding = (
  finding: NonNullable<GetFindingsCommandOutput['Findings']>[number],
  region: string,
  accountId: string,
): AWSFinding => ({
  title: finding.Title || 'Untitled Finding',
  description: finding.Description || 'No description available',
  remediation: finding.Remediation?.Recommendation?.Text || 'No remediation available',
  status: finding.Compliance?.Status || 'unknown',
  severity: finding.Severity?.Label || 'INFO',
  resultDetails: {
    ...finding,
    _metadata: {
      region,
      accountId,
    },
  },
});

const dedupeFindings = (findings: AWSFinding[]): AWSFinding[] => {
  const seen = new Set<string>();
  const deduped: AWSFinding[] = [];
  for (const finding of findings) {
    const findingId = (finding.resultDetails as { Id?: string })?.Id;
    const key = findingId || `${finding.title}-${finding.severity}-${finding.status}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(finding);
  }
  return deduped;
};

/**
 * Fetches security findings from AWS Security Hub
 * @returns Promise containing an array of findings
 */
async function fetch(credentials: AWSCredentials): Promise<AWSFinding[]> {
  try {
    const regions = resolveRegions(credentials);
    if (regions.length === 0) {
      throw new Error('No regions provided for AWS Security Hub fetch');
    }

    // 1. Assert that the credentials work (use first region for STS)
    console.log('Asserting credentials');
    const [primaryRegion] = regions;
    if (!primaryRegion) {
      throw new Error('No regions provided for AWS Security Hub fetch');
    }
    const accountId = await assertKeysWork(credentials, primaryRegion);

    // 3. Define filters for the findings we want to retrieve.
    const params: GetFindingsCommandInput = {
      Filters: {
        WorkflowStatus: [{ Value: 'NEW', Comparison: 'EQUALS' }], // only active findings
        ComplianceStatus: [{ Value: 'FAILED', Comparison: 'EQUALS' }], // only failed control checks
      },
      MaxResults: 100, // adjust page size as needed (max 100)
    };

    console.log('Defined filters');

    const allFindings: AWSFinding[] = [];

    for (const region of regions) {
      console.log(`Fetching findings in region ${region}`);
      const config: SecurityHubClientConfig = {
        region,
        credentials: {
          accessKeyId: credentials.access_key_id,
          secretAccessKey: credentials.secret_access_key,
        },
      };
      const securityHubClient = new SecurityHubClient(config);

      const command = new GetFindingsCommand(params);
      let response: GetFindingsCommandOutput = await securityHubClient.send(command);

      if (response.Findings) {
        allFindings.push(
          ...response.Findings.map((finding) => buildFinding(finding, region, accountId)),
        );
      }

      let nextToken = response.NextToken;
      while (nextToken) {
        const nextPageParams: GetFindingsCommandInput = {
          ...params,
          NextToken: nextToken,
        };
        response = await securityHubClient.send(new GetFindingsCommand(nextPageParams));

        if (response.Findings) {
          allFindings.push(
            ...response.Findings.map((finding) => buildFinding(finding, region, accountId)),
          );
        }

        nextToken = response.NextToken;
      }
    }

    return dedupeFindings(allFindings);
  } catch (error) {
    console.error('Error fetching Security Hub findings:', error);
    throw error;
  }
}

// Export the function and types for use in other modules
export { fetch };
export type { AWSCredentials, AWSFinding };

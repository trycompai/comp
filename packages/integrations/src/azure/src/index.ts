import { DefaultAzureCredential } from '@azure/identity';
import nodeFetch from 'node-fetch';

const API_VERSION = '2019-01-01';

interface AzureCredentials {
  AZURE_CLIENT_ID: string;
  AZURE_TENANT_ID: string;
  AZURE_CLIENT_SECRET: string;
  AZURE_SUBSCRIPTION_ID: string;
}

interface AzureFinding {
  title: string;
  description: string;
  remediation: string;
  status: string;
  severity: string;
  resultDetails: any;
}

interface ComplianceControl {
  Id: string;
  name: string;
  standard: string;
  Title: string;
  description: string;
  state: string;
  Compliance: {
    Status: string;
  };
  Severity: {
    Label: string;
  };
  Remediation: {
    Recommendation: {
      Text: string;
      Url: string;
    };
  };
  Description: string;
}

interface ComplianceStandard {
  name: string;
  controls: ComplianceControl[];
}

interface AzureResponse {
  value: Array<{
    name: string;
    properties?: {
      description: string;
      state: string;
    };
  }>;
}

interface AzureControlResponse {
  name: string;
  properties?: {
    description: string;
    state: string;
  };
}

/**
 * Fetches compliance data from Azure Security Center
 * @returns Promise containing an array of compliance standards with their controls
 */
async function fetchComplianceData(credentials: AzureCredentials): Promise<AzureFinding[]> {
  try {
    console.log('Fetching Azure compliance data...');
    const BASE_URL = `https://management.azure.com/subscriptions/${credentials.AZURE_SUBSCRIPTION_ID}/providers/Microsoft.Security`;

    // Set environment variables for DefaultAzureCredential
    process.env.AZURE_CLIENT_ID = credentials.AZURE_CLIENT_ID;
    process.env.AZURE_TENANT_ID = credentials.AZURE_TENANT_ID;
    process.env.AZURE_CLIENT_SECRET = credentials.AZURE_CLIENT_SECRET;

    // Get access token
    console.log('Fetching access token...');
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://management.azure.com/.default');
    const token = tokenResponse.token;

    // Fetch all compliance standards
    console.log('Fetching compliance standards...');
    const standardsUrl = `${BASE_URL}/regulatoryComplianceStandards?api-version=${API_VERSION}`;
    const standardsResponse = await nodeFetch(standardsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!standardsResponse.ok) {
      throw new Error(`Failed to fetch standards: ${standardsResponse.statusText}`);
    }

    const standardsData = (await standardsResponse.json()) as AzureResponse;
    const standards = standardsData.value.map((standard) => standard.name);

    // Fetch controls for each standard
    console.log('Fetching controls for the following standards: ', standards);
    const complianceData: ComplianceStandard[] = [];

    // Fetch details for each control
    const findings: AzureFinding[] = [];

    for (const standard of standards) {
      console.log(`Fetching controls for ${standard}...`);
      const controlsUrl = `${BASE_URL}/regulatoryComplianceStandards/${standard}/regulatoryComplianceControls?api-version=${API_VERSION}`;
      const controlsResponse = await nodeFetch(controlsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!controlsResponse.ok) {
        console.error(`Failed to fetch controls for ${standard}: ${controlsResponse.statusText}`);
        continue;
      }

      const controlsData = (await controlsResponse.json()) as AzureResponse;
      const controls = controlsData.value.map((control) => control.name);

      console.log(`Fetching details for ${controls.length} controls in ${standard}...`);
      for (const control of controls) {
        const detailsUrl = `${BASE_URL}/regulatoryComplianceStandards/${standard}/regulatoryComplianceControls/${control}?api-version=${API_VERSION}`;
        const detailsResponse = await nodeFetch(detailsUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!detailsResponse.ok) {
          console.error(
            `Failed to fetch details for ${control} in ${standard}: ${detailsResponse.statusText}`,
          );
          continue;
        }

        const detailsData = (await detailsResponse.json()) as AzureControlResponse;
        const controlDetail = detailsData;
        if (controlDetail?.properties) {
          findings.push({
            title: controlDetail.properties.description || 'Untitled Control',
            description: controlDetail.properties.description || 'No description available',
            remediation: 'No remediation available', // Azure API doesn't provide remediation in this endpoint
            status: controlDetail.properties.state.toUpperCase(),
            severity: 'INFO',
            resultDetails: controlDetail,
          });
        }
      }
    }
    console.log('Fetched all compliance data!');
    return findings;
  } catch (error) {
    console.error('Error fetching Azure compliance data:', error);
    throw error;
  }
}

export { fetchComplianceData as fetch };
export type { AzureCredentials, AzureFinding };

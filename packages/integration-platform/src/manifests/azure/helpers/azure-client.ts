/**
 * Azure API Client Helper
 * Handles authentication and API calls to Azure REST APIs
 */

import type {
  AzureActionGroup,
  AzureAlertRule,
  AzureListResponse,
  AzureRoleAssignment,
  AzureRoleDefinition,
  AzureSecurityAlert,
  AzureSecurityAssessment,
} from '../types';

interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Get an access token for Azure Management API
 */
export async function getAzureAccessToken(credentials: AzureCredentials): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: 'https://management.azure.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure authentication failed: ${error}`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

/**
 * Make an authenticated request to Azure Management API
 */
async function azureRequest<T>(
  accessToken: string,
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure API error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Fetch all pages of a paginated Azure response
 */
async function fetchAllPages<T>(accessToken: string, initialUrl: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | undefined = initialUrl;

  while (url) {
    const response: AzureListResponse<T> = await azureRequest(accessToken, url);
    results.push(...response.value);
    url = response.nextLink;
  }

  return results;
}

/**
 * Get security alerts from Microsoft Defender for Cloud
 */
export async function getSecurityAlerts(
  accessToken: string,
  subscriptionId: string,
): Promise<AzureSecurityAlert[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/alerts?api-version=2022-01-01`;
  return fetchAllPages<AzureSecurityAlert>(accessToken, url);
}

/**
 * Get security assessments from Microsoft Defender for Cloud
 */
export async function getSecurityAssessments(
  accessToken: string,
  subscriptionId: string,
): Promise<AzureSecurityAssessment[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/assessments?api-version=2021-06-01`;
  return fetchAllPages<AzureSecurityAssessment>(accessToken, url);
}

/**
 * Get role assignments for a subscription
 */
export async function getRoleAssignments(
  accessToken: string,
  subscriptionId: string,
): Promise<AzureRoleAssignment[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`;
  return fetchAllPages<AzureRoleAssignment>(accessToken, url);
}

/**
 * Get role definitions for a subscription
 */
export async function getRoleDefinitions(
  accessToken: string,
  subscriptionId: string,
): Promise<AzureRoleDefinition[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions?api-version=2022-04-01`;
  return fetchAllPages<AzureRoleDefinition>(accessToken, url);
}

/**
 * Get metric alert rules
 */
export async function getAlertRules(
  accessToken: string,
  subscriptionId: string,
): Promise<AzureAlertRule[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Insights/metricAlerts?api-version=2018-03-01`;
  return fetchAllPages<AzureAlertRule>(accessToken, url);
}

/**
 * Get action groups for notifications
 */
export async function getActionGroups(
  accessToken: string,
  subscriptionId: string,
): Promise<AzureActionGroup[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Insights/actionGroups?api-version=2023-01-01`;
  return fetchAllPages<AzureActionGroup>(accessToken, url);
}

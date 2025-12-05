import { GoogleAuth, type JWT } from 'google-auth-library';
import type { GCPCredentials } from '../types';

export interface GCPServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface GCPClients {
  auth: GoogleAuth;
  client: JWT;
  projectId: string;
  organizationId?: string;
}

/**
 * Parse and validate GCP service account credentials
 */
export function parseServiceAccountKey(credentials: GCPCredentials): GCPServiceAccountKey {
  if (!credentials.serviceAccountKey) {
    throw new Error('Service account key is required');
  }

  try {
    const key = JSON.parse(credentials.serviceAccountKey) as GCPServiceAccountKey;

    if (key.type !== 'service_account') {
      throw new Error('Invalid key type. Expected "service_account"');
    }

    if (!key.project_id || !key.private_key || !key.client_email) {
      throw new Error('Invalid service account key: missing required fields');
    }

    return key;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format in service account key');
    }
    throw error;
  }
}

/**
 * Create authenticated GCP clients from credentials
 */
export async function createGCPClients(
  credentials: GCPCredentials,
  log: (msg: string) => void,
): Promise<GCPClients> {
  log('Parsing service account credentials...');
  const serviceAccountKey = parseServiceAccountKey(credentials);

  log(`Authenticating as ${serviceAccountKey.client_email}...`);

  // Create auth client with required scopes
  const auth = new GoogleAuth({
    credentials: {
      client_email: serviceAccountKey.client_email,
      private_key: serviceAccountKey.private_key,
    },
    projectId: serviceAccountKey.project_id,
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/cloud-platform.read-only',
    ],
  });

  const client = (await auth.getClient()) as JWT;

  log(`Authenticated successfully for project: ${serviceAccountKey.project_id}`);

  return {
    auth,
    client,
    projectId: serviceAccountKey.project_id,
  };
}

/**
 * Make an authenticated request to a GCP API
 */
export async function gcpRequest<T>(
  client: JWT,
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {},
): Promise<T> {
  const { method = 'GET', body, params } = options;

  // Build URL with query params
  const urlObj = new URL(url);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      urlObj.searchParams.set(key, value);
    }
  }

  const response = await client.request<T>({
    url: urlObj.toString(),
    method,
    data: body,
  });

  return response.data;
}

/**
 * Fetch Security Command Centre findings
 */
export async function getSecurityFindings(
  client: JWT,
  organizationId: string,
  options: {
    filter?: string;
    pageSize?: number;
    pageToken?: string;
  } = {},
): Promise<{
  findings: Array<{
    finding: {
      name: string;
      category: string;
      severity: string;
      state: string;
      resourceName: string;
      description?: string;
      createTime: string;
      eventTime: string;
      sourceProperties?: Record<string, unknown>;
    };
  }>;
  nextPageToken?: string;
}> {
  const { filter, pageSize = 100, pageToken } = options;

  const params: Record<string, string> = {
    pageSize: pageSize.toString(),
  };

  if (filter) {
    params.filter = filter;
  }

  if (pageToken) {
    params.pageToken = pageToken;
  }

  // Use the Security Command Centre API v2
  const url = `https://securitycenter.googleapis.com/v2/organizations/${organizationId}/sources/-/findings`;

  const response = await gcpRequest<{
    listFindingsResults?: Array<{
      finding: {
        name: string;
        category: string;
        severity: string;
        state: string;
        resourceName: string;
        description?: string;
        createTime: string;
        eventTime: string;
        sourceProperties?: Record<string, unknown>;
      };
    }>;
    nextPageToken?: string;
  }>(client, url, { params });

  return {
    findings: response.listFindingsResults || [],
    nextPageToken: response.nextPageToken,
  };
}

/**
 * Get IAM policy for a project
 */
export async function getProjectIAMPolicy(
  client: JWT,
  projectId: string,
): Promise<{
  version: number;
  bindings: Array<{
    role: string;
    members: string[];
  }>;
}> {
  const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`;

  return gcpRequest(client, url, {
    method: 'POST',
    body: {
      options: {
        requestedPolicyVersion: 3,
      },
    },
  });
}

/**
 * List service accounts in a project
 */
export async function listServiceAccounts(
  client: JWT,
  projectId: string,
  pageToken?: string,
): Promise<{
  accounts: Array<{
    name: string;
    email: string;
    displayName?: string;
    disabled: boolean;
  }>;
  nextPageToken?: string;
}> {
  const url = `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts`;

  const params: Record<string, string> = {
    pageSize: '100',
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  return gcpRequest(client, url, { params });
}

/**
 * Alerting Policy structure
 */
export interface AlertingPolicy {
  name: string;
  displayName: string;
  enabled: boolean;
  conditions: Array<{
    displayName: string;
    conditionThreshold?: {
      filter: string;
      comparison: string;
      thresholdValue?: number;
    };
    conditionAbsent?: {
      filter: string;
    };
    conditionMatchedLog?: {
      filter: string;
    };
  }>;
  notificationChannels?: string[];
  alertStrategy?: {
    notificationRateLimit?: {
      period: string;
    };
  };
  creationRecord?: {
    mutateTime: string;
  };
}

/**
 * List alerting policies in a project
 */
export async function listAlertingPolicies(
  client: JWT,
  projectId: string,
  pageToken?: string,
): Promise<{
  alertPolicies: AlertingPolicy[];
  nextPageToken?: string;
}> {
  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/alertPolicies`;

  const params: Record<string, string> = {
    pageSize: '100',
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  return gcpRequest(client, url, { params });
}

/**
 * Log Sink structure
 */
export interface LogSink {
  name: string;
  destination: string;
  filter?: string;
  disabled: boolean;
  createTime?: string;
  updateTime?: string;
}

/**
 * List log sinks in a project
 */
export async function listLogSinks(
  client: JWT,
  projectId: string,
  pageToken?: string,
): Promise<{
  sinks: LogSink[];
  nextPageToken?: string;
}> {
  const url = `https://logging.googleapis.com/v2/projects/${projectId}/sinks`;

  const params: Record<string, string> = {
    pageSize: '100',
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  return gcpRequest(client, url, { params });
}

/**
 * Notification Channel structure
 */
export interface NotificationChannel {
  name: string;
  type: string;
  displayName: string;
  enabled: boolean;
  labels?: Record<string, string>;
}

/**
 * List notification channels in a project
 */
export async function listNotificationChannels(
  client: JWT,
  projectId: string,
  pageToken?: string,
): Promise<{
  notificationChannels: NotificationChannel[];
  nextPageToken?: string;
}> {
  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/notificationChannels`;

  const params: Record<string, string> = {
    pageSize: '100',
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  return gcpRequest(client, url, { params });
}

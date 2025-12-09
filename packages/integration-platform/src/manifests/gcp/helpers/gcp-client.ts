import type { GCPCredentials } from '../types';

export interface GCPClient {
  accessToken: string;
  projectId: string;
  organizationId?: string;
}

/**
 * Create a GCP client from OAuth credentials
 */
export function createGCPClient(
  credentials: GCPCredentials,
  projectId: string,
  log: (msg: string) => void,
): GCPClient {
  if (!credentials.access_token) {
    throw new Error('Access token is required');
  }

  log(`Authenticating with OAuth token for project: ${projectId}`);

  return {
    accessToken: credentials.access_token,
    projectId,
  };
}

/**
 * Make an authenticated request to a GCP API
 */
export async function gcpRequest<T>(
  client: GCPClient,
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

  const response = await fetch(urlObj.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GCP API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Get IAM policy for a project
 */
export async function getProjectIAMPolicy(
  client: GCPClient,
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
  client: GCPClient,
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
  client: GCPClient,
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
  client: GCPClient,
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
  client: GCPClient,
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

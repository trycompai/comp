// Google Cloud Platform types

/**
 * GCP OAuth credentials
 * With OAuth, we get an access token from Google
 */
export interface GCPCredentials {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

// Security Command Centre types
export interface SCCFinding {
  name: string;
  parent: string;
  resourceName: string;
  state: 'ACTIVE' | 'INACTIVE';
  category: string;
  externalUri?: string;
  sourceProperties: Record<string, unknown>;
  securityMarks?: {
    name: string;
    marks: Record<string, string>;
  };
  findingClass:
    | 'THREAT'
    | 'VULNERABILITY'
    | 'MISCONFIGURATION'
    | 'OBSERVATION'
    | 'SCC_ERROR'
    | 'POSTURE_VIOLATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  canonicalName?: string;
  description?: string;
  createTime: string;
  eventTime: string;
}

export interface SCCFindingsResponse {
  listFindingsResults: Array<{
    finding: SCCFinding;
    stateChange?: string;
    resource?: {
      name: string;
      displayName?: string;
      type?: string;
    };
  }>;
  nextPageToken?: string;
  totalSize?: number;
}

// IAM types
export interface GCPIAMBinding {
  role: string;
  members: string[];
  condition?: {
    title: string;
    description?: string;
    expression: string;
  };
}

export interface GCPIAMPolicy {
  version: number;
  bindings: GCPIAMBinding[];
  etag: string;
}

export interface GCPServiceAccount {
  name: string;
  projectId: string;
  uniqueId: string;
  email: string;
  displayName?: string;
  description?: string;
  disabled: boolean;
}

export interface GCPServiceAccountsResponse {
  accounts: GCPServiceAccount[];
  nextPageToken?: string;
}

// Resource Manager types
export interface GCPProject {
  projectNumber: string;
  projectId: string;
  lifecycleState: 'ACTIVE' | 'DELETE_REQUESTED' | 'DELETE_IN_PROGRESS';
  name: string;
  createTime: string;
  parent?: {
    type: string;
    id: string;
  };
}

export interface GCPProjectsResponse {
  projects: GCPProject[];
  nextPageToken?: string;
}

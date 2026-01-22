/**
 * API Response Types
 *
 * These types represent the shape of data returned by API endpoints.
 * Used by both the API (for response typing) and frontend (for request typing).
 */

import type { CredentialField } from './types';

// Re-export CredentialField for convenience
export type { CredentialField };

/**
 * Integration provider as returned by the API
 */
export interface IntegrationProviderResponse {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
  authType: 'oauth2' | 'api_key' | 'basic' | 'jwt' | 'custom';
  capabilities: string[];
  isActive: boolean;
  docsUrl?: string;
  credentialFields?: CredentialField[];
  setupInstructions?: string;
  /** For OAuth providers: whether platform admin has configured credentials */
  oauthConfigured?: boolean;
  /** Tasks that will be auto-satisfied when this integration is connected */
  mappedTasks?: Array<{ id: string; name: string }>;
  /** Required variables that must be configured after connection */
  requiredVariables?: string[];
}

/**
 * Connection status values
 */
export type ConnectionStatusValue = 'pending' | 'active' | 'error' | 'paused' | 'disconnected';

/**
 * Integration connection as returned by the API
 */
export interface IntegrationConnectionResponse {
  id: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  status: ConnectionStatusValue;
  authStrategy: string;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  syncCadence: string | null;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Connection list item (lighter version for lists)
 */
export interface ConnectionListItemResponse {
  id: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  status: ConnectionStatusValue;
  authStrategy: string;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  errorMessage: string | null;
  variables: Record<string, string | number | boolean | string[]> | null;
  createdAt: string;
}

/**
 * OAuth start response
 */
export interface OAuthStartResponse {
  authorizationUrl: string;
}

/**
 * OAuth availability check response
 */
export interface OAuthAvailabilityResponse {
  available: boolean;
  hasOrgCredentials: boolean;
  hasPlatformCredentials: boolean;
  setupInstructions?: string;
  createAppUrl?: string;
}

/**
 * Test connection response
 */
export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

/**
 * Create connection response
 */
export interface CreateConnectionResponse {
  success: boolean;
  connectionId?: string;
  error?: string;
}

/**
 * Variable option for dynamic selects
 */
export interface VariableOptionResponse {
  value: string;
  label: string;
}

/**
 * Integration check for a task
 */
export interface TaskIntegrationCheckResponse {
  taskId: string;
  checkId: string;
  checkName: string;
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string;
  connectionId: string | null;
  connectionStatus: ConnectionStatusValue | null;
  lastRunAt: string | null;
  lastRunStatus: 'passed' | 'failed' | 'error' | null;
  needsConfiguration: boolean;
}

/**
 * Check run history item
 */
export interface CheckRunHistoryItemResponse {
  id: string;
  checkId: string;
  checkName: string;
  status: 'passed' | 'failed' | 'error' | 'running';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  errorMessage: string | null;
  findings: CheckRunFindingResponse[];
  passingResults: CheckRunPassingResponse[];
}

/**
 * Check run finding
 */
export interface CheckRunFindingResponse {
  id: string;
  title: string;
  description: string;
  resourceType: string;
  resourceId: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  remediation: string | null;
  evidence: Record<string, unknown>;
}

/**
 * Check run passing result
 */
export interface CheckRunPassingResponse {
  id: string;
  title: string;
  description: string;
  resourceType: string;
  resourceId: string;
  evidence: Record<string, unknown>;
}

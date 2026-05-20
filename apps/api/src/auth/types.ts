// Types for API authentication - supports API keys and session-based auth

import { Departments } from '@db';

export interface AuthenticatedRequest extends Request {
  organizationId: string;
  authType: 'api-key' | 'session' | 'service';
  isApiKey: boolean;
  isServiceToken?: boolean;
  serviceName?: string;
  isPlatformAdmin: boolean;
  userId?: string;
  userEmail?: string;
  userRoles: string[] | null;
  memberId?: string; // Member ID for assignment filtering (only available for session auth)
  memberDepartment?: Departments; // Member department for visibility filtering (only available for session auth)
  apiKeyScopes?: string[]; // Scopes for API key auth (empty = legacy full access)
  apiKeyId?: string; // ApiKey row id — only set for API key auth. Used by ActingUserResolver / audit log attribution.
  apiKeyName?: string; // Human-readable API key name (e.g. "CI Pipeline") — only set for API key auth.
  impersonatedBy?: string; // User ID of the admin who initiated impersonation (only set during impersonation sessions)
  sessionId?: string; // Session ID (only set for session auth)
  sessionDeviceAgent?: boolean; // Whether the session is a device-agent session (only set for session auth)
}

export interface AuthContext {
  organizationId: string;
  authType: 'api-key' | 'session' | 'service';
  isApiKey: boolean;
  isServiceToken?: boolean;
  serviceName?: string;
  isPlatformAdmin: boolean;
  userId?: string; // Only available for session auth
  userEmail?: string; // Only available for session auth
  userRoles: string[] | null;
  memberId?: string; // Member ID for assignment filtering (only available for session auth)
  memberDepartment?: Departments; // Member department for visibility filtering (only available for session auth)
  apiKeyScopes?: string[]; // Scopes for API key auth (empty = legacy full access)
  impersonatedBy?: string; // User ID of the admin who initiated impersonation (only set during impersonation sessions)
}

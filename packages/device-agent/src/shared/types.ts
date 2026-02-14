export type DevicePlatform = 'macos' | 'windows' | 'linux';

export type DeviceCheckType = 'disk_encryption' | 'antivirus' | 'password_policy' | 'screen_lock';

export interface CheckResult {
  checkType: DeviceCheckType;
  passed: boolean;
  details: {
    method: string;
    raw: string;
    message: string;
    exception?: string;
  };
  checkedAt: string;
}

export interface DeviceInfo {
  name: string;
  hostname: string;
  platform: DevicePlatform;
  osVersion: string;
  serialNumber?: string;
  hardwareModel?: string;
}

export interface RegisterDeviceRequest {
  name: string;
  hostname: string;
  platform: DevicePlatform;
  osVersion: string;
  serialNumber?: string;
  hardwareModel?: string;
  agentVersion?: string;
  organizationId: string;
}

export interface RegisterDeviceResponse {
  deviceId: string;
}

export interface CheckInRequest {
  deviceId: string;
  checks: CheckResult[];
  agentVersion?: string;
}

export interface CheckInResponse {
  isCompliant: boolean;
  nextCheckIn: string;
}

export interface DeviceStatus {
  id: string;
  name: string;
  hostname: string;
  platform: DevicePlatform;
  osVersion: string;
  isCompliant: boolean;
  lastCheckIn: string | null;
  checks: Array<{
    checkType: DeviceCheckType;
    passed: boolean;
    details: Record<string, unknown> | null;
    checkedAt: string;
  }>;
}

/** A single organization registration with its device ID */
export interface OrgRegistration {
  organizationId: string;
  organizationName: string;
  deviceId: string;
}

/** Stored authentication data — supports multiple organizations */
export interface StoredAuth {
  sessionToken: string;
  /** The cookie name used by the server (e.g. 'better-auth.session_token' or '__Secure-better-auth.session_token') */
  cookieName: string;
  userId: string;
  organizations: OrgRegistration[];
}

/** Response from the /api/device-agent/my-organizations endpoint */
export interface MyOrganizationsResponse {
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: string;
  }>;
}

/** The type of remediation available for a check */
export type RemediationType = 'auto_fix' | 'admin_fix' | 'open_settings' | 'guide_only';

/** Describes what remediation is available for a given check */
export interface RemediationInfo {
  checkType: DeviceCheckType;
  available: boolean;
  type: RemediationType;
  requiresAdmin: boolean;
  description: string;
  instructions: string[];
  settingsDeepLink?: string;
}

/** Result returned after attempting a remediation */
export interface RemediationResult {
  checkType: DeviceCheckType;
  success: boolean;
  message: string;
  openedSettings?: boolean;
}

/** IPC channel names for main <-> renderer communication */
export const IPC_CHANNELS = {
  GET_AUTH_STATUS: 'auth:get-status',
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  AUTH_STATE_CHANGED: 'auth:state-changed',
  GET_CHECK_RESULTS: 'checks:get-results',
  RUN_CHECKS_NOW: 'checks:run-now',
  CHECK_RESULTS_UPDATED: 'checks:results-updated',
  GET_DEVICE_INFO: 'device:get-info',
  REMEDIATE_CHECK: 'remediation:remediate-check',
  GET_REMEDIATION_INFO: 'remediation:get-info',
  GET_APP_VERSION: 'app:get-version',
} as const;

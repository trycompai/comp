/** MSP360 Managed Backup (MBS) API types. Field names follow the public swagger. */

export interface Msp360LoginRequest {
  UserName: string;
  Password: string;
}

export interface Msp360LoginResponse {
  access_token?: string;
  accessToken?: string;
  AccessToken?: string;
  token?: string;
  Token?: string;
}

export interface Msp360Admin {
  AdminID?: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  Enabled?: boolean;
  LastLogin?: string;
  DateCreated?: string;
  Companies?: string[];
  PermissionsModels?: Record<string, number | string>;
}

/**
 * MonitoringPlanType (see MSP360 docs). Restore family: 2, 4, 6, 8, 10, 12, 15, 17.
 * SQLResore is the documented spelling for value 8.
 */
export type Msp360PlanType = number | string;

/**
 * MonitoringPlanStatus: Success=0, Overdue=1, Error=2, Running=3, Unknown=4,
 * Interrupted=5, UnexpectedlyClosed=6, Warning=7
 */
export type Msp360PlanStatus = number | string;

export interface Msp360MonitoringRow {
  PlanName?: string;
  CompanyName?: string;
  UserName?: string;
  UserID?: string;
  ComputerName?: string;
  LastStart?: string;
  NextStart?: string;
  Status?: Msp360PlanStatus;
  ErrorMessage?: string;
  PlanId?: string;
  PlanType?: Msp360PlanType;
  DetailedReportLink?: string;
}

export const DEFAULT_BACKUP_API_BASE_URL = 'https://api.mspbackups.com';

/** Restore / restore-verification family (MonitoringPlanType). */
export const RESTORE_PLAN_TYPE_VALUES = new Set([2, 4, 6, 8, 10, 12, 15, 17]);

/** Backup family (excludes restore, NA, consistency check). */
export const BACKUP_PLAN_TYPE_VALUES = new Set([1, 3, 5, 7, 9, 11, 14, 16]);

export const SUCCESS_STATUS_VALUES = new Set([0, '0', 'success', 'succeeded', 'completed', 'ok']);
export const FAILED_STATUS_VALUES = new Set([
  1,
  2,
  5,
  6,
  7,
  '1',
  '2',
  '5',
  '6',
  '7',
  'overdue',
  'error',
  'failed',
  'interrupted',
  'unexpectedlyclosed',
  'warning',
]);

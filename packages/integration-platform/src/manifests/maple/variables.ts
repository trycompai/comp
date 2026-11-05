import type { CheckVariable, CheckVariableValues } from '../../types';

const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_MAX_UNUSED_DAYS = 90;
const DEFAULT_MAX_FULL_ACCESS_AGE_DAYS = 365;
const DEFAULT_AUDIT_WINDOW_DAYS = 30;

/** Reads a positive whole number from a variable, falling back when unset or invalid */
function positiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const environmentVariable: CheckVariable = {
  id: 'environment',
  label: 'Environment',
  helpText:
    'Only check services reporting this deployment.environment (for example "production"). Leave empty to check every environment.',
  type: 'text',
  required: false,
  placeholder: 'production',
};

export const parseEnvironment = (variables: CheckVariableValues | undefined): string | null => {
  const value = variables?.environment;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const lookbackHoursVariable: CheckVariable = {
  id: 'lookback_hours',
  label: 'Activity window (hours)',
  helpText: 'A service counts as active if Maple received traces from it in this many hours.',
  type: 'number',
  required: false,
  default: DEFAULT_LOOKBACK_HOURS,
};

export const parseLookbackHours = (variables: CheckVariableValues | undefined): number =>
  positiveInt(variables?.lookback_hours, DEFAULT_LOOKBACK_HOURS);

export const maxUnusedDaysVariable: CheckVariable = {
  id: 'max_unused_days',
  label: 'Maximum days unused',
  helpText: 'Flag API keys that have not been used for this many days. They should be revoked.',
  type: 'number',
  required: false,
  default: DEFAULT_MAX_UNUSED_DAYS,
};

export const parseMaxUnusedDays = (variables: CheckVariableValues | undefined): number =>
  positiveInt(variables?.max_unused_days, DEFAULT_MAX_UNUSED_DAYS);

export const maxFullAccessAgeDaysVariable: CheckVariable = {
  id: 'max_full_access_age_days',
  label: 'Maximum age of full-access keys (days)',
  helpText:
    'Flag API keys without scope restrictions that are older than this. Rotate them or replace them with scoped keys.',
  type: 'number',
  required: false,
  default: DEFAULT_MAX_FULL_ACCESS_AGE_DAYS,
};

export const parseMaxFullAccessAgeDays = (variables: CheckVariableValues | undefined): number =>
  positiveInt(variables?.max_full_access_age_days, DEFAULT_MAX_FULL_ACCESS_AGE_DAYS);

export const auditWindowDaysVariable: CheckVariable = {
  id: 'audit_window_days',
  label: 'Audit window (days)',
  helpText: 'How many days of Maple audit log to collect as evidence on each run.',
  type: 'number',
  required: false,
  default: DEFAULT_AUDIT_WINDOW_DAYS,
};

export const parseAuditWindowDays = (variables: CheckVariableValues | undefined): number =>
  positiveInt(variables?.audit_window_days, DEFAULT_AUDIT_WINDOW_DAYS);

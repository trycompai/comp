import {
  BACKUP_PLAN_TYPE_VALUES,
  FAILED_STATUS_VALUES,
  INCOMPLETE_STATUS_VALUES,
  RESTORE_PLAN_TYPE_VALUES,
  SUCCESS_STATUS_VALUES,
  type Msp360MonitoringRow,
} from './types';

export type ParsedMonitoring =
  | { ok: true; rows: Msp360MonitoringRow[] }
  | { ok: false };

/** Array or a known list envelope. Anything else is malformed — do not treat as empty/N/A. */
export function parseMonitoringPayload(payload: unknown): ParsedMonitoring {
  if (Array.isArray(payload)) {
    return { ok: true, rows: payload as Msp360MonitoringRow[] };
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'Monitoring']) {
      if (Array.isArray(record[key])) {
        return { ok: true, rows: record[key] as Msp360MonitoringRow[] };
      }
    }
    return { ok: false };
  }
  return { ok: false };
}

function numericOrName(value: unknown): { n: number | null; name: string } {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { n: value, name: String(value) };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return { n: Number(trimmed), name: trimmed };
    }
    return { n: null, name: trimmed };
  }
  return { n: null, name: '' };
}

export function isRestorePlan(row: Msp360MonitoringRow): boolean {
  const { n, name } = numericOrName(row.PlanType);
  // Numeric type wins: a backup-family id is never a restore just because the plan name says so.
  if (n != null) {
    return RESTORE_PLAN_TYPE_VALUES.has(n);
  }
  const blob = `${name} ${row.PlanName ?? ''}`;
  // Docs spell SQL restore as SQLResore (missing t).
  return /sqlresore/i.test(blob) || /restore/i.test(blob) || /verif/i.test(blob);
}

export function isBackupPlan(row: Msp360MonitoringRow): boolean {
  if (isRestorePlan(row)) {
    return false;
  }
  const { n, name } = numericOrName(row.PlanType);
  if (n != null) {
    return BACKUP_PLAN_TYPE_VALUES.has(n);
  }
  if (!name || /^n\/?a$/i.test(name)) {
    return false;
  }
  if (/consistenc/i.test(name)) {
    return false;
  }
  return /backup/i.test(name) || /backup/i.test(row.PlanName ?? '');
}

export function isSuccessStatus(status: unknown): boolean {
  if (typeof status === 'number') {
    return SUCCESS_STATUS_VALUES.has(status);
  }
  if (typeof status === 'string') {
    const key = status.trim().toLowerCase();
    return SUCCESS_STATUS_VALUES.has(key) || SUCCESS_STATUS_VALUES.has(status);
  }
  return false;
}

export function isFailedStatus(status: unknown): boolean {
  if (isSuccessStatus(status) || isIncompleteStatus(status)) {
    return false;
  }
  if (typeof status === 'number') {
    return FAILED_STATUS_VALUES.has(status);
  }
  if (typeof status === 'string') {
    const key = status.trim().toLowerCase();
    return FAILED_STATUS_VALUES.has(key) || /fail|error|overdue|interrupt/i.test(key);
  }
  return false;
}

export function isIncompleteStatus(status: unknown): boolean {
  if (typeof status === 'number') {
    return INCOMPLETE_STATUS_VALUES.has(status);
  }
  if (typeof status === 'string') {
    const key = status.trim().toLowerCase();
    return INCOMPLETE_STATUS_VALUES.has(key);
  }
  return false;
}

export function parseTimestamp(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysAgo(from: Date, now = new Date()): number {
  return (now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

export function rowId(row: Msp360MonitoringRow, index: number): string {
  if (row.PlanId) {
    return row.PlanId;
  }
  return `${row.ComputerName ?? 'host'}:${row.PlanName ?? 'plan'}:${index}`;
}

import {
  BACKUP_PLAN_TYPE_VALUES,
  FAILED_STATUS_VALUES,
  RESTORE_PLAN_TYPE_VALUES,
  SUCCESS_STATUS_VALUES,
  type Msp360MonitoringRow,
} from './types';

export function asMonitoringRows(payload: unknown): Msp360MonitoringRow[] {
  if (Array.isArray(payload)) {
    return payload as Msp360MonitoringRow[];
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'Monitoring']) {
      if (Array.isArray(record[key])) {
        return record[key] as Msp360MonitoringRow[];
      }
    }
  }
  return [];
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
  if (n != null && RESTORE_PLAN_TYPE_VALUES.has(n)) {
    return true;
  }
  return /restore/i.test(name) || /verif/i.test(`${row.PlanName ?? ''} ${name}`);
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
  if (isSuccessStatus(status)) {
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
  return row.PlanId || `${row.ComputerName ?? 'host'}:${row.PlanName ?? index}`;
}

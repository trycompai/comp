import type { CheckContext } from '../../types';
import { DEFAULT_RMM_API_BASE_URL, STAT_PATHS, type RmmPage, type RmmRecord } from './types';

export function credString(ctx: CheckContext, key: string, fallback = ''): string {
  const value = ctx.credentials[key];
  if (Array.isArray(value)) {
    return String(value[0] ?? fallback);
  }
  if (value == null || value === '') {
    return fallback;
  }
  return String(value);
}

export function rmmBaseUrl(ctx: CheckContext): string {
  return credString(ctx, 'baseUrl', DEFAULT_RMM_API_BASE_URL).replace(/\/$/, '');
}

export function rmmToken(ctx: CheckContext): string {
  return credString(ctx, 'api_key') || credString(ctx, 'token') || credString(ctx, 'apiKey');
}

export function hidOf(row: RmmRecord, fallback = ''): string {
  const raw = row.hid ?? row.Hid ?? row.HID ?? row.computerHid ?? row.ComputerHid;
  return raw != null && String(raw).trim() ? String(raw) : fallback;
}

export function pageRows<T extends RmmRecord>(payload: unknown): { rows: T[]; total: number | null } {
  if (Array.isArray(payload)) {
    return { rows: payload as T[], total: payload.length };
  }
  if (payload && typeof payload === 'object') {
    const record = payload as RmmPage<T>;
    const rows = (record.data ?? record.items ?? record.results ?? []) as T[];
    const total =
      typeof record.total === 'number'
        ? record.total
        : typeof record.Total === 'number'
          ? record.Total
          : null;
    return { rows, total };
  }
  return { rows: [], total: null };
}

async function fetchStatPage(
  ctx: CheckContext,
  path: string,
  baseUrl: string,
  pageNumber: number,
  pageSize: number,
): Promise<unknown> {
  return ctx.fetch(path, {
    baseUrl,
    params: {
      pageNumber: String(pageNumber),
      pageSize: String(pageSize),
      page: String(pageNumber),
      take: String(pageSize),
    },
  });
}

/**
 * Page through a fleet-wide stat endpoint. Tries current `/api/v1/computers/stat/{type}/latest`
 * then the older `/api/v1/computers/stat/{type}/latest` path from earlier docs.
 */
export async function fetchAllStat<T extends RmmRecord>(
  ctx: CheckContext,
  type: keyof typeof STAT_PATHS,
): Promise<T[]> {
  const baseUrl = rmmBaseUrl(ctx);
  const paths = STAT_PATHS[type];
  const pageSize = 100;
  let lastError: unknown;

  for (const path of paths) {
    const all: T[] = [];
    try {
      for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
        const payload = await fetchStatPage(ctx, path, baseUrl, pageNumber, pageSize);
        const { rows, total } = pageRows<T>(payload);
        if (rows.length === 0) {
          break;
        }
        all.push(...rows);
        if (total != null && all.length >= total) {
          break;
        }
        if (rows.length < pageSize) {
          break;
        }
      }
      return all;
    } catch (error) {
      lastError = error;
      ctx.log(`MSP360 RMM ${path} failed, trying fallback if any`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch RMM ${type} stats`);
}

export function indexByHid(rows: RmmRecord[]): Map<string, RmmRecord[]> {
  const map = new Map<string, RmmRecord[]>();
  for (const row of rows) {
    const hid = hidOf(row);
    if (!hid) {
      continue;
    }
    const list = map.get(hid) ?? [];
    list.push(row);
    map.set(hid, list);
  }
  return map;
}

export function truthyFlag(row: RmmRecord, keys: string[]): boolean | null {
  for (const key of keys) {
    if (!(key in row)) {
      continue;
    }
    const value = row[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (['true', 'enabled', 'active', 'running', 'ok', 'protected', '1', 'yes'].includes(v)) {
        return true;
      }
      if (['false', 'disabled', 'inactive', 'stopped', 'off', '0', 'no', 'missing'].includes(v)) {
        return false;
      }
    }
  }
  return null;
}

export function pickString(row: RmmRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return undefined;
}

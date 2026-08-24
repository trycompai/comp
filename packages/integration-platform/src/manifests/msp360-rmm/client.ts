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

function isRecord(value: unknown): value is RmmRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Live RMM hid values mix `{GUID}` and bare GUIDs; joins must ignore braces/case. */
export function normalizeHid(raw: string): string {
  return raw.replace(/[{}]/g, '').trim().toLowerCase();
}

export function hidOf(row: RmmRecord, fallback = ''): string {
  const header = isRecord(row.header) ? row.header : null;
  const candidates = [
    row.hid,
    row.Hid,
    row.HID,
    row.computerHid,
    row.ComputerHid,
    header?.hid,
    header?.Hid,
    header?.HID,
    header?.computerHid,
  ];
  for (const candidate of candidates) {
    if (candidate != null && String(candidate).trim()) {
      return normalizeHid(String(candidate));
    }
  }
  return fallback ? normalizeHid(fallback) : fallback;
}

/**
 * Fleet stat endpoints wrap each computer as `{ header, data: [...] }`.
 * Flatten plugin `data` rows and stamp the header hid so later joins work.
 */
export function expandStatRows(rows: RmmRecord[]): RmmRecord[] {
  const out: RmmRecord[] = [];
  for (const row of rows) {
    const header = isRecord(row.header) ? row.header : {};
    const hid = hidOf(row) || hidOf(header);
    const inner = Array.isArray(row.data) ? row.data.filter(isRecord) : [];
    const networkFrom = (record: RmmRecord): RmmRecord | null =>
      isRecord(record.network) ? record.network : null;

    if (inner.length === 0) {
      const network = networkFrom(row) ?? networkFrom(header);
      out.push({
        ...header,
        ...row,
        hid,
        ip: row.ip ?? network?.ip4Address ?? network?.ip4Address ?? network?.ipAddress,
        mac: row.mac ?? network?.macAddress,
      });
      continue;
    }

    for (const item of inner) {
      const network = networkFrom(item) ?? networkFrom(header);
      out.push({
        ...header,
        ...item,
        hid: hid || hidOf(item),
        computerName: item.computerName ?? header.computerName ?? row.computerName,
        ip: item.ip ?? network?.ip4Address ?? network?.ip4Address ?? network?.ipAddress,
        mac: item.mac ?? network?.macAddress,
      });
    }
  }
  return out;
}

export function pageRows<T extends RmmRecord>(payload: unknown): { rows: T[]; total: number | null } {
  if (Array.isArray(payload)) {
    return { rows: payload as T[], total: payload.length };
  }
  if (payload && typeof payload === 'object') {
    const record = payload as RmmPage<T>;
    const rows = (
      (Array.isArray(record.items) ? record.items : null) ??
      (Array.isArray(record.data) ? record.data : null) ??
      (Array.isArray(record.results) ? record.results : null) ??
      []
    ) as T[];
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
      return expandStatRows(all) as T[];
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

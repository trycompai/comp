import type { CheckContext } from '../../types';
import {
  DEFAULT_RMM_API_BASE_URL,
  HOST_NAME_KEYS,
  MAX_STAT_PAGES,
  STAT_PAGE_SIZE,
  STAT_PATHS,
  type RmmPage,
  type RmmRecord,
} from './types';

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
    // Bare arrays do not include a fleet total. Using length here would stop pagination
    // after a full first page (length === pageSize).
    return { rows: payload as T[], total: null };
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

function pageFingerprint<T extends RmmRecord>(rows: T[]): string {
  if (rows.length === 0) {
    return '';
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  return `${hidOf(first)}:${hidOf(last)}:${rows.length}`;
}

function reportTruncation(
  ctx: CheckContext,
  type: string,
  collected: number,
  maxPages: number,
): void {
  const hostCap = maxPages * STAT_PAGE_SIZE;
  ctx.warn(`MSP360 RMM ${type} inventory truncated after ${maxPages} pages`, {
    collected,
    pageSize: STAT_PAGE_SIZE,
    pageCap: maxPages,
  });
  ctx.fail({
    title: `MSP360 RMM ${type} inventory truncated`,
    description: `Stopped after ${maxPages} pages of ${STAT_PAGE_SIZE}. Remaining hosts were not collected. Evidence below is a partial fleet.`,
    resourceType: 'connection',
    resourceId: `msp360-rmm-${type}-truncated`,
    severity: 'medium',
    remediation: `Narrow the RMM token scope or ask Comp AI to raise the page cap if this tenant is larger than ${hostCap} hosts.`,
    evidence: {
      collected,
      pageSize: STAT_PAGE_SIZE,
      pageCap: maxPages,
      truncated: true,
    },
  });
}

/**
 * Page through a fleet-wide stat endpoint.
 * Bare arrays have no total — keep paging until a short page, a repeated page, or the cap.
 */
export async function fetchAllStat<T extends RmmRecord>(
  ctx: CheckContext,
  type: keyof typeof STAT_PATHS,
  options?: { maxPages?: number },
): Promise<T[]> {
  const baseUrl = rmmBaseUrl(ctx);
  const path = STAT_PATHS[type];
  const maxPages = options?.maxPages ?? MAX_STAT_PAGES;
  const all: T[] = [];
  let lastPageFull = false;
  let previousFingerprint = '';

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const payload = await fetchStatPage(ctx, path, baseUrl, pageNumber, STAT_PAGE_SIZE);
    const { rows, total } = pageRows<T>(payload);
    if (rows.length === 0) {
      lastPageFull = false;
      break;
    }

    const fingerprint = pageFingerprint(rows);
    if (pageNumber > 1 && fingerprint && fingerprint === previousFingerprint) {
      ctx.warn('MSP360 RMM page repeated; treating as complete (API likely ignored paging)', {
        path,
        pageNumber,
      });
      lastPageFull = false;
      break;
    }
    previousFingerprint = fingerprint;

    all.push(...rows);

    // Unpaged dump larger than one page — do not request page 2 of the same blob.
    if (Array.isArray(payload) && rows.length > STAT_PAGE_SIZE) {
      lastPageFull = false;
      break;
    }
    if (total != null && all.length >= total) {
      lastPageFull = false;
      break;
    }
    if (rows.length < STAT_PAGE_SIZE) {
      lastPageFull = false;
      break;
    }
    lastPageFull = true;
  }

  // A full last page at the cap might still be the entire fleet (exactly N * pageSize).
  // Probe one more page before calling that truncation.
  if (lastPageFull) {
    const extraPage = maxPages + 1;
    const extraPayload = await fetchStatPage(ctx, path, baseUrl, extraPage, STAT_PAGE_SIZE);
    const { rows: extraRows } = pageRows<T>(extraPayload);
    const extraFingerprint = pageFingerprint(extraRows);
    if (extraRows.length > 0 && extraFingerprint !== previousFingerprint) {
      all.push(...extraRows);
      reportTruncation(ctx, String(type), all.length, maxPages);
    }
  }

  return expandStatRows(all) as T[];
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

export function hostName(row: RmmRecord, fallback: string): string {
  return pickString(row, HOST_NAME_KEYS) ?? fallback;
}

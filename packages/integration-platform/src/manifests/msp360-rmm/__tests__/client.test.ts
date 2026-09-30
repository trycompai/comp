import { describe, expect, it } from 'bun:test';
import type { CheckContext } from '../../../types';
import { expandStatRows, fetchAllStat, hidOf, normalizeHid, pageRows } from '../client';

describe('msp360-rmm client parsing', () => {
  it('normalizes braced and mixed-case hids', () => {
    expect(normalizeHid('{3C934B6B-A47B-43F7-A458-C4D5610468B7}')).toBe(
      '3c934b6b-a47b-43f7-a458-c4d5610468b7',
    );
    expect(hidOf({ header: { hid: '{ABC}' } })).toBe('abc');
  });

  it('reads page rows from items (live RMM shape)', () => {
    const { rows, total } = pageRows({ items: [{ hid: 'h1' }], total: 1, pageNumber: 1, pageSize: 100 });
    expect(rows).toHaveLength(1);
    expect(total).toBe(1);
  });

  it('does not treat a bare array length as a fleet total', () => {
    const page = Array.from({ length: 100 }, (_, i) => ({ hid: `h${i}` }));
    const { rows, total } = pageRows(page);
    expect(rows).toHaveLength(100);
    expect(total).toBeNull();
  });

  it('keeps paging a full first page when the API omits total', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ hid: `a${i}`, computerName: `a${i}` }));
    const page2 = [{ hid: 'b1', computerName: 'last' }];
    const pages: Record<string, unknown> = { '1': page1, '2': page2 };
    const ctx = {
      credentials: { api_key: 't', baseUrl: 'https://api.rmm.mspbackups.com' },
      log: () => {},
      warn: () => {},
      fail: () => {},
      fetch: async (_path: string, init?: { params?: Record<string, string> }) => {
        const n = init?.params?.pageNumber ?? '1';
        return pages[n] ?? [];
      },
    } as unknown as CheckContext;
    const rows = await fetchAllStat(ctx, 'host');
    expect(rows.length).toBe(101);
    expect(rows.some((r) => r.hid === 'b1')).toBe(true);
  });

  it('does not report truncation when a full last page is the end of the fleet', async () => {
    const pages: Record<string, unknown> = {
      '1': Array.from({ length: 100 }, (_, i) => ({ hid: `p1-${i}` })),
      '2': Array.from({ length: 100 }, (_, i) => ({ hid: `p2-${i}` })),
      '3': [],
    };
    const failed: Array<{ resourceId?: string }> = [];
    const ctx = {
      credentials: { api_key: 't', baseUrl: 'https://api.rmm.mspbackups.com' },
      log: () => {},
      warn: () => {},
      fail: (result: { resourceId?: string }) => {
        failed.push(result);
      },
      fetch: async (_path: string, init?: { params?: Record<string, string> }) => {
        const n = init?.params?.pageNumber ?? '1';
        return pages[n] ?? [];
      },
    } as unknown as CheckContext;
    const rows = await fetchAllStat(ctx, 'host', { maxPages: 2 });
    expect(rows).toHaveLength(200);
    expect(failed.some((r) => r.resourceId === 'msp360-rmm-host-truncated')).toBe(false);
  });

  it('reports truncation only after a probe page still has new hosts', async () => {
    const pages: Record<string, unknown> = {
      '1': Array.from({ length: 100 }, (_, i) => ({ hid: `p1-${i}` })),
      '2': Array.from({ length: 100 }, (_, i) => ({ hid: `p2-${i}` })),
      '3': [{ hid: 'overflow', computerName: 'more' }],
    };
    const failed: Array<{ resourceId?: string; evidence?: { pageCap?: number }; description?: string }> =
      [];
    const ctx = {
      credentials: { api_key: 't', baseUrl: 'https://api.rmm.mspbackups.com' },
      log: () => {},
      warn: () => {},
      fail: (result: { resourceId?: string; evidence?: { pageCap?: number }; description?: string }) => {
        failed.push(result);
      },
      fetch: async (_path: string, init?: { params?: Record<string, string> }) => {
        const n = init?.params?.pageNumber ?? '1';
        return pages[n] ?? [];
      },
    } as unknown as CheckContext;
    const rows = await fetchAllStat(ctx, 'host', { maxPages: 2 });
    expect(rows.some((r) => r.hid === 'overflow')).toBe(true);
    const truncation = failed.find((r) => r.resourceId === 'msp360-rmm-host-truncated');
    expect(truncation?.evidence?.pageCap).toBe(2);
    expect(truncation?.description).toContain('2 pages');
  });

  it('flattens header/data envelopes onto plugin rows', () => {
    const expanded = expandStatRows([
      {
        header: { hid: '{H1}', computerName: 'hetzner' },
        data: [{ osName: 'Debian', network: { ip4Address: '10.0.0.1', macAddress: 'aa' } }],
      },
    ]);
    expect(expanded).toHaveLength(1);
    expect(expanded[0]?.hid).toBe('h1');
    expect(expanded[0]?.computerName).toBe('hetzner');
    expect(expanded[0]?.osName).toBe('Debian');
    expect(expanded[0]?.ip).toBe('10.0.0.1');
  });
});

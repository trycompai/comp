import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';

import type { AuditLogWithRelations } from '@/hooks/use-audit-logs';
import { AUDIT_LOG_PAGE_SIZE, useOffsetAuditLogs } from './use-offset-audit-logs';

// Fresh SWR cache per hook render so batches don't leak between tests.
function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

// RecentAuditLogs / the pager only key off `id`, so a trimmed shape is enough.
const makeLogs = (ids: string[]) =>
  ids.map((id) => ({ id })) as unknown as AuditLogWithRelations[];

describe('useOffsetAuditLogs', () => {
  it('loads the first batch and derives hasMore from the server total', async () => {
    const fetchPage = vi.fn(async () => ({ data: makeLogs(['a', 'b']), total: 5 }));

    const { result } = renderHook(
      () => useOffsetAuditLogs({ cacheKey: ['k'], fetchPage }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.logs).toHaveLength(2));
    expect(result.current.total).toBe(5);
    expect(result.current.hasMore).toBe(true);
    expect(fetchPage).toHaveBeenCalledWith({ take: AUDIT_LOG_PAGE_SIZE, offset: 0 });
  });

  it('appends the next batch (deduped) and stops when the total is reached', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: makeLogs(['a', 'b']), total: 4 })
      // 'b' overlaps a shifted window — it must not be duplicated.
      .mockResolvedValueOnce({ data: makeLogs(['b', 'c', 'd']), total: 4 });

    const { result } = renderHook(
      () => useOffsetAuditLogs({ cacheKey: ['k'], fetchPage }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.logs).toHaveLength(2));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.logs).toHaveLength(4));
    expect(result.current.logs.map((l) => l.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.current.hasMore).toBe(false);
    expect(fetchPage).toHaveBeenLastCalledWith({
      take: AUDIT_LOG_PAGE_SIZE,
      offset: AUDIT_LOG_PAGE_SIZE,
    });
  });

  it('resets the accumulated window when the filter identity changes', async () => {
    const { result, rerender } = renderHook(
      ({ key, data, total }: { key: string; data: string[]; total: number }) =>
        useOffsetAuditLogs({
          cacheKey: ['k', key],
          fetchPage: async () => ({ data: makeLogs(data), total }),
        }),
      {
        wrapper,
        initialProps: { key: 'v1', data: ['a', 'b', 'c'], total: 3 },
      },
    );

    await waitFor(() => expect(result.current.logs).toHaveLength(3));

    // Switching filters must replace, not append onto, the prior batch.
    rerender({ key: 'v2', data: ['x'], total: 1 });

    await waitFor(() => expect(result.current.logs.map((l) => l.id)).toEqual(['x']));
    expect(result.current.total).toBe(1);
    expect(result.current.hasMore).toBe(false);
  });
});

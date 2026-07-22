'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';

import type { AuditLogWithRelations } from '@/hooks/use-audit-logs';

/** Server batch size — audit logs are paged in chunks of 100. */
export const AUDIT_LOG_PAGE_SIZE = 100;

/** Shape every paginated audit-log endpoint returns (extra fields are ignored). */
export interface AuditLogsPage {
  data: AuditLogWithRelations[];
  total: number;
}

export interface OffsetAuditLogsResult {
  /** All logs loaded so far (batch 0..N), in the server's desc order. */
  logs: AuditLogWithRelations[];
  /** Total rows on the server — drives the pager's "of N" and next-arrow. */
  total: number;
  /** Whether another server batch exists to load. */
  hasMore: boolean;
  /** Fetch the next batch and append it. */
  loadMore: () => void;
  /** A subsequent batch (offset > 0) is currently loading. */
  isLoadingMore: boolean;
  /** The very first batch is loading (nothing to show yet). */
  isLoading: boolean;
}

/**
 * Generic offset-accumulate pager for audit logs: keeps a growing window into
 * the server total by fetching successive batches and merging them (de-duped by
 * id). Callers supply the SWR cache key and a `fetchPage` for their endpoint —
 * see {@link useAdminAuditLogs} and `usePaginatedAuditLogs`.
 *
 * Mirrors the repo's offset + loadMore convention (use-automation-versions.ts).
 */
export function useOffsetAuditLogs({
  cacheKey,
  fetchPage,
}: {
  cacheKey: readonly unknown[];
  fetchPage: (args: { take: number; offset: number }) => Promise<AuditLogsPage>;
}): OffsetAuditLogsResult {
  const [logs, setLogs] = useState<AuditLogWithRelations[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Reset the accumulated window whenever the filter identity changes (e.g. a
  // vendor's task-item ids finish loading), so batches from a prior filter
  // can't bleed into the new one.
  const filterKey = JSON.stringify(cacheKey);
  useEffect(() => {
    setLogs([]);
    setOffset(0);
    setTotal(0);
  }, [filterKey]);

  const { isLoading, error } = useSWR(
    [...cacheKey, offset],
    () => fetchPage({ take: AUDIT_LOG_PAGE_SIZE, offset }),
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 0,
      onSuccess: (page) => {
        setTotal(page.total);
        setLogs((prev) => {
          if (offset === 0) return page.data;
          const seen = new Set(prev.map((log) => log.id));
          return [...prev, ...page.data.filter((log) => !seen.has(log.id))];
        });
      },
    },
  );

  const loadMore = useCallback(() => {
    // Only advance once the current batch has settled successfully. While it's
    // still loading (or errored — SWR retries the same offset), advancing would
    // skip the in-flight batch entirely, dropping those rows from the pager.
    if (isLoading || error) return;
    setOffset((prev) => prev + AUDIT_LOG_PAGE_SIZE);
  }, [isLoading, error]);

  return {
    logs,
    total,
    hasMore: logs.length < total,
    loadMore,
    isLoadingMore: isLoading && offset > 0,
    isLoading: isLoading && offset === 0 && logs.length === 0,
  };
}

'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';

import { apiClient } from '@/lib/api-client';
import type { AuditLogWithRelations } from '@/hooks/use-audit-logs';

/** Server batch size — we page the admin audit log in chunks of 100. */
const PAGE_SIZE = 100;

interface AdminAuditLogsPage {
  data: AuditLogWithRelations[];
  total: number;
}

export interface UseAdminAuditLogsResult {
  /** All logs loaded so far (batch 0..N), oldest→newest within the desc order. */
  logs: AuditLogWithRelations[];
  /** Total rows on the server (drives the pager's "of N" and next-arrow enabling). */
  total: number;
  /** Whether another server batch exists to load. */
  hasMore: boolean;
  /** Fetch the next batch of 100 and append it. */
  loadMore: () => void;
  /** A subsequent batch (offset > 0) is currently loading. */
  isLoadingMore: boolean;
  /** The very first batch is loading (nothing to show yet). */
  isLoading: boolean;
}

/**
 * Paginates the platform-admin org audit log by offset, accumulating batches so
 * the caller can page past the first 100 records. Mirrors the repo's offset +
 * loadMore convention (see use-automation-versions.ts): plain SWR keyed by
 * offset, results merged in onSuccess, `hasMore` derived from the server total.
 */
export function useAdminAuditLogs(orgId: string): UseAdminAuditLogsResult {
  const [logs, setLogs] = useState<AuditLogWithRelations[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const { isLoading } = useSWR(
    ['admin-audit-logs', orgId, offset],
    async () => {
      const res = await apiClient.get<AdminAuditLogsPage>(
        `/v1/admin/organizations/${orgId}/audit-logs?take=${PAGE_SIZE}&offset=${offset}`,
      );
      if (res.error || !res.data) {
        throw new Error(res.error ?? 'Failed to load audit logs');
      }
      return res.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 0,
      onSuccess: (page) => {
        setTotal(page.total);
        setLogs((prev) => {
          if (offset === 0) return page.data;
          // Append, de-duping by id so a re-validated first batch (or rows that
          // shifted as new activity arrived) can't create duplicates.
          const seen = new Set(prev.map((log) => log.id));
          return [...prev, ...page.data.filter((log) => !seen.has(log.id))];
        });
      },
    },
  );

  const loadMore = useCallback(() => {
    setOffset((prev) => prev + PAGE_SIZE);
  }, []);

  return {
    logs,
    total,
    hasMore: logs.length < total,
    loadMore,
    isLoadingMore: isLoading && offset > 0,
    isLoading: isLoading && offset === 0 && logs.length === 0,
  };
}

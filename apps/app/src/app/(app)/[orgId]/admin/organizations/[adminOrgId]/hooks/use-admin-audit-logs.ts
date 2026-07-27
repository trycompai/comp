'use client';

import { apiClient } from '@/lib/api-client';
import {
  useOffsetAuditLogs,
  type AuditLogsPage,
  type OffsetAuditLogsResult,
} from '@/hooks/use-offset-audit-logs';

export type UseAdminAuditLogsResult = OffsetAuditLogsResult;

/**
 * Paginates the platform-admin org audit log by offset, accumulating batches so
 * the caller can page past the first 100 records. Thin wrapper over
 * {@link useOffsetAuditLogs} bound to the admin endpoint.
 */
export function useAdminAuditLogs(orgId: string): UseAdminAuditLogsResult {
  return useOffsetAuditLogs({
    cacheKey: ['admin-audit-logs', orgId],
    fetchPage: async ({ take, offset }) => {
      const res = await apiClient.get<AuditLogsPage>(
        `/v1/admin/organizations/${orgId}/audit-logs?take=${take}&offset=${offset}`,
      );
      if (res.error || !res.data) {
        throw new Error(res.error ?? 'Failed to load audit logs');
      }
      return res.data;
    },
  });
}

'use client';

import { apiClient } from '@/lib/api-client';
import type { AuditLog, Member, Organization, User } from '@db';
import { useEffect, useRef } from 'react';
import useSWR from 'swr';

export type AuditLogWithRelations = AuditLog & {
  user: User | null;
  member: Member | null;
  organization: Organization;
};

type AuditLogsApiResponse = {
  data: AuditLogWithRelations[];
  authType?: string;
  authenticatedUser?: { id: string; email: string };
};

export const auditLogsKey = (entityType: string, entityId: string, pathContains?: string) =>
  ['/v1/audit-logs', entityType, entityId, pathContains ?? ''] as const;

interface UseAuditLogsOptions {
  entityType: string;
  entityId: string;
  /** Filter logs to only those whose path contains this string (e.g., automation ID) */
  pathContains?: string;
  initialData?: AuditLogWithRelations[];
}

export function useAuditLogs({
  entityType,
  entityId,
  pathContains,
  initialData,
}: UseAuditLogsOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    auditLogsKey(entityType, entityId, pathContains),
    async () => {
      let url = `/v1/audit-logs?entityType=${entityType}&entityId=${entityId}`;
      if (pathContains) url += `&pathContains=${encodeURIComponent(pathContains)}`;
      const response = await apiClient.get<AuditLogsApiResponse>(url);
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) return [];
      return response.data.data;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: true,
      refreshInterval: 10_000,
    },
  );

  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && initialData) {
      seeded.current = true;
      mutate(initialData, false);
    }
  }, [initialData, mutate]);

  return {
    logs: Array.isArray(data) ? data : [],
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

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

export const auditLogsKey = (entityType: string, entityId: string) =>
  ['/v1/audit-logs', entityType, entityId] as const;

interface UseAuditLogsOptions {
  entityType: string;
  entityId: string;
  initialData?: AuditLogWithRelations[];
}

export function useAuditLogs({
  entityType,
  entityId,
  initialData,
}: UseAuditLogsOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    auditLogsKey(entityType, entityId),
    async () => {
      const response = await apiClient.get<AuditLogsApiResponse>(
        `/v1/audit-logs?entityType=${entityType}&entityId=${entityId}`,
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) return [];
      return response.data.data;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
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

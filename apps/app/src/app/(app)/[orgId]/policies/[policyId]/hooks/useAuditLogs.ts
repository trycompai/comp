'use client';

import { apiClient } from '@/lib/api-client';
import type { AuditLog, Member, Organization, User } from '@db';
import useSWR from 'swr';

type AuditLogWithRelations = AuditLog & {
  user: User | null;
  member: Member | null;
  organization: Organization;
};

type ActivityApiResponse = {
  data: AuditLogWithRelations[];
  authType?: string;
  authenticatedUser?: { id: string; email: string };
};

export const auditLogsKey = (policyId: string, organizationId: string) =>
  ['/v1/policies/activity', policyId, organizationId] as const;

interface UseAuditLogsOptions {
  policyId: string;
  organizationId: string;
  initialData?: AuditLogWithRelations[];
}

export function useAuditLogs({
  policyId,
  organizationId,
  initialData,
}: UseAuditLogsOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    auditLogsKey(policyId, organizationId),
    async () => {
      const response = await apiClient.get<ActivityApiResponse>(
        `/v1/policies/${policyId}/activity`,
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) return [];

      return response.data.data;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: false,
      revalidateOnFocus: false,
    },
  );

  return {
    logs: Array.isArray(data) ? data : [],
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

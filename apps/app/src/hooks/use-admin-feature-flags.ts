'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

export interface AdminOrgFeatureFlag {
  key: string;
  name: string;
  description: string;
  active: boolean;
  enabled: boolean;
  createdAt: string | null;
}

interface ListResponse {
  data: AdminOrgFeatureFlag[];
}

export const adminOrgFeatureFlagsKey = (orgId: string) =>
  ['/v1/admin/organizations', orgId, 'feature-flags'] as const;

export function useAdminOrgFeatureFlags(orgId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? adminOrgFeatureFlagsKey(orgId) : null,
    async () => {
      const response = await apiClient.get<ListResponse>(
        `/v1/admin/organizations/${orgId}/feature-flags`,
      );
      if (response.error) throw new Error(response.error);
      return response.data?.data ?? [];
    },
    { revalidateOnFocus: false },
  );

  const flags = Array.isArray(data) ? data : [];

  return {
    flags,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

export async function setAdminOrgFeatureFlag({
  orgId,
  flagKey,
  enabled,
}: {
  orgId: string;
  flagKey: string;
  enabled: boolean;
}): Promise<AdminOrgFeatureFlag | null> {
  const response = await apiClient.patch<{ data: AdminOrgFeatureFlag }>(
    `/v1/admin/organizations/${orgId}/feature-flags`,
    { flagKey, enabled },
  );
  if (response.error) throw new Error(response.error);
  return response.data?.data ?? null;
}

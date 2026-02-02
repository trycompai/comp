'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';
import type { CustomRole } from '../components/RolesTable';

interface UseRoleOptions {
  roleId: string;
  organizationId: string;
  initialData?: CustomRole | null;
}

export function useRole({ roleId, organizationId, initialData }: UseRoleOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/v1/roles', roleId, organizationId],
    async ([endpoint, id, orgId]) => {
      const response = await apiClient.get<CustomRole>(`${endpoint}/${id}`, orgId);
      if (response.error) throw new Error(response.error);
      return response.data ?? null;
    },
    {
      fallbackData: initialData ?? undefined,
      revalidateOnMount: true,
      revalidateOnFocus: false,
    },
  );

  return {
    role: data ?? null,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

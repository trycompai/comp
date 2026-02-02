'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';
import type { CustomRole } from '../components/RolesTable';

interface RolesResponse {
  builtInRoles: Array<{
    name: string;
    isBuiltIn: boolean;
    description: string;
  }>;
  customRoles: CustomRole[];
}

interface UseRolesOptions {
  organizationId: string;
  initialData?: CustomRole[];
}

export function useRoles({ organizationId, initialData }: UseRolesOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/v1/roles', organizationId],
    async ([endpoint, orgId]) => {
      const response = await apiClient.get<RolesResponse>(endpoint, orgId);
      if (response.error) throw new Error(response.error);
      return response.data?.customRoles ?? [];
    },
    {
      fallbackData: initialData?.length ? initialData : undefined,
      revalidateOnMount: true,
      revalidateOnFocus: false,
    },
  );

  return {
    roles: data ?? [],
    isLoading: !data && !error && !initialData,
    error,
    mutate,
  };
}

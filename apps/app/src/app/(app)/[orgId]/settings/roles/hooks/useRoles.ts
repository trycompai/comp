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
  initialData?: CustomRole[];
}

export function useRoles({ initialData }: UseRolesOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/v1/roles'],
    async ([endpoint]) => {
      const response = await apiClient.get<RolesResponse>(endpoint);
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

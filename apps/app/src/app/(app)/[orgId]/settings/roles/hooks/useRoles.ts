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

export const rolesListKey = () => ['/v1/roles'] as const;

interface UseRolesOptions {
  initialData?: CustomRole[];
}

export function useRoles({ initialData }: UseRolesOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    rolesListKey(),
    async () => {
      const response = await apiClient.get<RolesResponse>('/v1/roles');
      if (response.error) throw new Error(response.error);
      return response.data?.customRoles ?? [];
    },
    {
      fallbackData: initialData?.length ? initialData : undefined,
      revalidateOnMount: !initialData?.length,
      revalidateOnFocus: false,
    },
  );

  const roles = Array.isArray(data) ? data : [];

  const createRole = async (body: { name: string; permissions: Record<string, string[]> }) => {
    const response = await apiClient.post<CustomRole>('/v1/roles', body);
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data!;
  };

  const updateRole = async (
    id: string,
    body: { name: string; permissions: Record<string, string[]> },
  ) => {
    const response = await apiClient.patch<CustomRole>(`/v1/roles/${id}`, body);
    if (response.error) throw new Error(response.error);
    await mutate();
    return response.data!;
  };

  const deleteRole = async (id: string) => {
    const previous = roles;

    await mutate(
      roles.filter((r) => r.id !== id),
      false,
    );

    try {
      const response = await apiClient.delete(`/v1/roles/${id}`);
      if (response.error) throw new Error(response.error);
      await mutate();
    } catch (err) {
      await mutate(previous, false);
      throw err;
    }
  };

  return {
    roles,
    isLoading: !data && !error && !initialData,
    error,
    mutate,
    createRole,
    updateRole,
    deleteRole,
  };
}

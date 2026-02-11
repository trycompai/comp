'use client';

import { apiClient } from '@/lib/api-client';
import type { Member, User } from '@db';
import { useCallback } from 'react';
import useSWR from 'swr';

interface EmployeeData extends Member {
  user: User;
}

interface EmployeeApiResponse extends EmployeeData {
  authType: string;
  authenticatedUser?: { id: string; email: string };
}

interface UpdateEmployeeData {
  name?: string;
  email?: string;
  department?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface UseEmployeeOptions {
  employeeId: string;
  initialData?: EmployeeData;
}

export function useEmployee({ employeeId, initialData }: UseEmployeeOptions) {
  const { data, error, isLoading, mutate } = useSWR<EmployeeData>(
    employeeId ? ['employee', employeeId] : null,
    async () => {
      const response =
        await apiClient.get<EmployeeApiResponse>(
          `/v1/people/${employeeId}`,
        );
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to fetch employee');
      }
      return response.data;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  const updateEmployee = useCallback(
    async (updateData: UpdateEmployeeData) => {
      const response = await apiClient.patch<EmployeeData>(
        `/v1/people/${employeeId}`,
        updateData,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      await mutate();
      return response.data;
    },
    [employeeId, mutate],
  );

  return {
    employee: data ?? initialData,
    isLoading,
    error,
    updateEmployee,
    mutate,
  };
}

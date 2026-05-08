'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

type PolicySummary = {
  id: string;
  name: string;
  status: string;
  frequency: string | null;
  department: string | null;
};

export type TaskPolicyGroup = {
  control: { id: string; name: string };
  policies: PolicySummary[];
};

type ApiResponse = {
  data: TaskPolicyGroup[];
  count: number;
};

export const taskPoliciesKey = (taskId: string, organizationId: string) =>
  ['/v1/tasks/policies', taskId, organizationId] as const;

interface UseTaskPoliciesOptions {
  taskId: string;
  organizationId: string;
  initialData?: { data: TaskPolicyGroup[]; count: number } | null;
}

export function useTaskPolicies({
  taskId,
  organizationId,
  initialData,
}: UseTaskPoliciesOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    taskPoliciesKey(taskId, organizationId),
    async () => {
      const response = await apiClient.get<ApiResponse>(
        `/v1/tasks/${taskId}/policies`,
      );
      if (response.error) throw new Error(response.error);
      return response.data ?? { data: [], count: 0 };
    },
    {
      fallbackData: initialData ?? undefined,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  return {
    groups: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

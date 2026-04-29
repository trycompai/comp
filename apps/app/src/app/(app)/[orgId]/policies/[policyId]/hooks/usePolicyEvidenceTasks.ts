'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

type TaskSummary = {
  id: string;
  title: string;
  status: string;
  frequency: string | null;
  department: string | null;
  automationStatus: 'AUTOMATED' | 'MANUAL';
  assigneeId: string | null;
};

export type PolicyEvidenceTaskGroup = {
  control: { id: string; name: string };
  tasks: TaskSummary[];
};

type ApiResponse = {
  data: PolicyEvidenceTaskGroup[];
  count: number;
};

export const policyEvidenceTasksKey = (policyId: string, organizationId: string) =>
  ['/v1/policies/evidence-tasks', policyId, organizationId] as const;

interface UsePolicyEvidenceTasksOptions {
  policyId: string;
  organizationId: string;
  initialData?: { data: PolicyEvidenceTaskGroup[]; count: number } | null;
}

export function usePolicyEvidenceTasks({
  policyId,
  organizationId,
  initialData,
}: UsePolicyEvidenceTasksOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    policyEvidenceTasksKey(policyId, organizationId),
    async () => {
      const response = await apiClient.get<ApiResponse>(
        `/v1/policies/${policyId}/evidence-tasks`,
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

import { apiClient } from '@/lib/api-client';
import type { EvidenceAutomationRun } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

export function useAutomationRuns() {
  const { automationId, taskId } = useParams<{
    automationId: string;
    taskId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR<EvidenceAutomationRun[]>(
    taskId && automationId
      ? `/v1/tasks/${taskId}/automations/${automationId}/runs`
      : null,
    async (url: string) => {
      const res = await apiClient.get<EvidenceAutomationRun[]>(url);
      if (res.error) throw new Error(res.error);
      const responseData = res.data;
      // API returns array directly (no data wrapper)
      return Array.isArray(responseData) ? responseData : [];
    },
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );

  return {
    runs: Array.isArray(data) ? data : undefined,
    isLoading,
    isError: !!error,
    mutate,
  };
}

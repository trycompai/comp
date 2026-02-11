import { apiClient } from '@/lib/api-client';
import type { EvidenceAutomationRun } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

export function useAutomationRuns() {
  const { automationId, taskId } = useParams<{
    automationId: string;
    taskId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR<{ data: EvidenceAutomationRun[] }>(
    taskId && automationId
      ? `/v1/tasks/${taskId}/automations/${automationId}/runs`
      : null,
    (url: string) => apiClient.get<{ data: EvidenceAutomationRun[] }>(url).then((res) => res.data!),
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );

  return {
    runs: Array.isArray(data?.data) ? data.data : undefined,
    isLoading,
    isError: !!error,
    mutate,
  };
}

import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface TaskAutomationData {
  id: string;
  name: string;
  description?: string;
  taskId: string;
  organizationId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  evaluationCriteria?: string;
  isEnabled: boolean;
}

interface UseTaskAutomationReturn {
  automation: TaskAutomationData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<any>;
}

export function useTaskAutomation(overrideAutomationId?: string): UseTaskAutomationReturn {
  const {
    orgId,
    taskId,
    automationId: paramsAutomationId,
  } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  // Use override ID if provided, otherwise use params
  const automationId = overrideAutomationId || paramsAutomationId;

  // Skip fetching if automationId is "new"
  const shouldFetch = automationId && automationId !== 'new';

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? [`automation-${automationId}`, orgId, taskId, automationId] : null,
    async () => {
      const response = await api.get<{
        success: boolean;
        automation: TaskAutomationData;
      }>(`/v1/tasks/${taskId}/automations/${automationId}`, orgId);

      if (response.error) {
        console.log('failed to fetch automation', response.error);
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        console.log('failed to fetch automation', response.data);
        throw new Error('Failed to fetch automation');
      }

      console.log('response.data.automation', response.data.automation);

      return response.data.automation;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      dedupingInterval: 2000,
      shouldRetryOnError: (error) => {
        // Don't retry on 404s
        return !error?.message?.includes('404');
      },
    },
  );

  return {
    automation: data,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
  };
}

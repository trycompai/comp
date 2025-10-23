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

export function useTaskAutomation(): UseTaskAutomationReturn {
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR(
    [`automation-${automationId}`, orgId, taskId, automationId],
    async () => {
      const response = await api.get<{
        success: boolean;
        automation: TaskAutomationData;
      }>(`/v1/tasks/${taskId}/automations/${automationId}`, orgId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to fetch automation');
      }

      return response.data.automation;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
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

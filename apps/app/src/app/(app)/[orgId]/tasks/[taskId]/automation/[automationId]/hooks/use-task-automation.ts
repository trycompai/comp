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
  mutate: () => Promise<unknown>;
  updateAutomation: (body: Partial<Pick<TaskAutomationData, 'name' | 'description'>>) => Promise<void>;
  deleteAutomation: () => Promise<void>;
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
      }>(`/v1/tasks/${taskId}/automations/${automationId}`);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to fetch automation');
      }

      return response.data.automation;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      dedupingInterval: 2000,
      shouldRetryOnError: (err: Error) => {
        return !err?.message?.includes('404');
      },
    },
  );

  const updateAutomation = async (
    body: Partial<Pick<TaskAutomationData, 'name' | 'description'>>,
  ) => {
    const realId = data?.id || automationId;
    const response = await api.patch(
      `/v1/tasks/${taskId}/automations/${realId}`,
      body,
    );
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  const deleteAutomation = async () => {
    const response = await api.delete(
      `/v1/tasks/${taskId}/automations/${automationId}`,
    );
    if (response.error) throw new Error(response.error);
  };

  return {
    automation: data,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
    updateAutomation,
    deleteAutomation,
  };
}

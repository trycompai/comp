import { api } from '@/lib/api-client';
import { EvidenceAutomation } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface UseTaskAutomationsReturn {
  automations: EvidenceAutomation[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<any>;
}

interface UseTaskAutomationsOptions {
  initialData?: EvidenceAutomation[];
}

export function useTaskAutomations({
  initialData,
}: UseTaskAutomationsOptions = {}): UseTaskAutomationsReturn {
  const { orgId, taskId } = useParams<{
    orgId: string;
    taskId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR(
    [`task-automations-${taskId}`, orgId, taskId],
    async () => {
      const response = await api.get<{
        success: boolean;
        automations: EvidenceAutomation[];
      }>(`/v1/tasks/${taskId}/automations`, orgId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to fetch automations');
      }

      return response.data.automations;
    },
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  return {
    automations: data,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
  };
}

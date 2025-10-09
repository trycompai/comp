import { api } from '@/lib/api-client';
import { EvidenceAutomation, EvidenceAutomationRun } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

type AutomationWithRuns = EvidenceAutomation & {
  runs: EvidenceAutomationRun[];
};

interface UseTaskAutomationsReturn {
  automations: AutomationWithRuns[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<any>;
}

interface UseTaskAutomationsOptions {
  initialData?: AutomationWithRuns[];
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
        automations: AutomationWithRuns[];
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

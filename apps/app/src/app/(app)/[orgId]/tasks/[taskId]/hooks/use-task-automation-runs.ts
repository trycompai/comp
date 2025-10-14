import { api } from '@/lib/api-client';
import { EvidenceAutomationRun } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

type AutomationRunWithName = EvidenceAutomationRun & {
  evidenceAutomation: {
    name: string;
  };
};

interface UseTaskAutomationRunsReturn {
  runs: AutomationRunWithName[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<any>;
}

interface UseTaskAutomationRunsOptions {
  initialData?: AutomationRunWithName[];
}

export function useTaskAutomationRuns({
  initialData,
}: UseTaskAutomationRunsOptions = {}): UseTaskAutomationRunsReturn {
  const { orgId, taskId } = useParams<{
    orgId: string;
    taskId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR(
    [`task-automation-runs-${taskId}`, orgId, taskId],
    async () => {
      const response = await api.get<AutomationRunWithName[]>(
        `/v1/tasks/${taskId}/automations/runs`,
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('Failed to fetch automation runs');
      }

      return response.data;
    },
    {
      fallbackData: initialData,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  return {
    runs: data,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
  };
}

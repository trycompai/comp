import { api } from '@/lib/api-client';
import { EvidenceAutomationVersion } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface UseAutomationVersionsReturn {
  versions: EvidenceAutomationVersion[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<any>;
}

export function useAutomationVersions(): UseAutomationVersionsReturn {
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR(
    [`automation-versions-${automationId}`, orgId, taskId, automationId],
    async () => {
      const response = await api.get<{
        success: boolean;
        versions: EvidenceAutomationVersion[];
      }>(`/v1/tasks/${taskId}/automations/${automationId}/versions`, orgId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to fetch versions');
      }

      return response.data.versions;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  return {
    versions: data,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
  };
}

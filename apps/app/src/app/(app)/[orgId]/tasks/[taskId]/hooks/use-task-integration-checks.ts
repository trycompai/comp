import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface TaskIntegrationCheck {
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string;
  checkId: string;
  checkName: string;
  checkDescription: string;
  isConnected: boolean;
  needsConfiguration: boolean;
  connectionId?: string;
  connectionStatus?: string;
}

interface UseTaskIntegrationChecksReturn {
  checks: TaskIntegrationCheck[];
  connectedChecks: TaskIntegrationCheck[];
  disconnectedChecks: TaskIntegrationCheck[];
  hasConnectedChecks: boolean;
  hasMappedChecks: boolean;
  isLoading: boolean;
  isError: boolean;
}

export function useTaskIntegrationChecks(): UseTaskIntegrationChecksReturn {
  const { orgId, taskId } = useParams<{
    orgId: string;
    taskId: string;
  }>();

  const { data, error, isLoading } = useSWR(
    taskId && orgId ? [`task-integration-checks-${taskId}`, orgId, taskId] : null,
    async () => {
      const response = await api.get<{
        checks: TaskIntegrationCheck[];
        task: { id: string; title: string; templateId: string | null };
      }>(`/v1/integrations/tasks/${taskId}/checks?organizationId=${orgId}`);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data?.checks || [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  const checks = data || [];
  const connectedChecks = checks.filter((c) => c.isConnected);
  const disconnectedChecks = checks.filter((c) => !c.isConnected);

  return {
    checks,
    connectedChecks,
    disconnectedChecks,
    hasConnectedChecks: connectedChecks.length > 0,
    hasMappedChecks: checks.length > 0,
    isLoading,
    isError: !!error,
  };
}

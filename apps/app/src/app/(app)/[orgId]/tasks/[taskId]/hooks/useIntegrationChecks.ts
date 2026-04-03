'use client';

import { api } from '@/lib/api-client';
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
  authType?: 'oauth2' | 'custom' | 'api_key' | 'basic' | 'jwt';
  oauthConfigured?: boolean;
}

interface StoredCheckRun {
  id: string;
  checkId: string;
  checkName: string;
  status: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  errorMessage?: string;
  logs?: Array<{
    level: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
  }>;
  provider: {
    slug: string;
    name: string;
  };
  results: Array<{
    id: string;
    passed: boolean;
    resourceType: string;
    resourceId: string;
    title: string;
    description?: string;
    severity?: string;
    remediation?: string;
    evidence?: Record<string, unknown>;
    collectedAt: string;
  }>;
  createdAt: string;
}

export type { TaskIntegrationCheck, StoredCheckRun };

export const integrationChecksKey = (taskId: string, orgId: string) =>
  ['/v1/integrations/tasks/checks', taskId, orgId] as const;

export const integrationRunsKey = (taskId: string, orgId: string) =>
  ['/v1/integrations/tasks/runs', taskId, orgId] as const;

interface UseIntegrationChecksOptions {
  taskId: string;
  orgId: string;
}

export function useIntegrationChecks({ taskId, orgId }: UseIntegrationChecksOptions) {
  const {
    data: checks,
    error: checksError,
    isLoading: checksLoading,
    mutate: mutateChecks,
  } = useSWR(
    integrationChecksKey(taskId, orgId),
    async () => {
      const response = await api.get<{
        checks: TaskIntegrationCheck[];
        task: { id: string; title: string; templateId: string | null };
      }>(`/v1/integrations/tasks/${taskId}/checks?organizationId=${orgId}`);
      if (response.error) throw new Error(response.error);
      return response.data?.checks ?? [];
    },
    {
      revalidateOnFocus: false,
    },
  );

  const {
    data: runs,
    error: runsError,
    isLoading: runsLoading,
    mutate: mutateRuns,
  } = useSWR(
    integrationRunsKey(taskId, orgId),
    async () => {
      const response = await api.get<{ runs: StoredCheckRun[] }>(
        `/v1/integrations/tasks/${taskId}/runs?organizationId=${orgId}`,
      );
      if (response.error) throw new Error(response.error);
      return response.data?.runs ?? [];
    },
    {
      revalidateOnFocus: false,
    },
  );

  const runCheck = async (
    connectionId: string,
    checkId: string,
  ): Promise<{ taskStatus?: string | null }> => {
    const response = await api.post<{
      success: boolean;
      error?: string;
      checkRunId?: string;
      taskStatus?: string | null;
    }>(`/v1/integrations/tasks/${taskId}/run-check?organizationId=${orgId}`, {
      connectionId,
      checkId,
    });

    if (response.data?.success) {
      await mutateRuns();
      return { taskStatus: response.data.taskStatus };
    }

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    throw new Error('Failed to run check');
  };

  return {
    checks: Array.isArray(checks) ? checks : [],
    runs: Array.isArray(runs) ? runs : [],
    isLoading: checksLoading || runsLoading,
    error: checksError?.message || runsError?.message || null,
    mutateChecks,
    mutateRuns,
    runCheck,
  };
}

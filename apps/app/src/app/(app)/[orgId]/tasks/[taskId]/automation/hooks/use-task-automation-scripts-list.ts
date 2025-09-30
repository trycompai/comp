/**
 * useTaskAutomationScriptsList Hook
 * 
 * Lists all task automation scripts for a given organization.
 * Provides automatic refresh and caching of the scripts list.
 * 
 * @example
 * ```tsx
 * const { scripts, isLoading, refresh } = useTaskAutomationScriptsList({
 *   orgId: 'org_123',
 *   refreshInterval: 15000 // 15 seconds
 * });
 * ```
 */

import useSWR from 'swr';
import { taskAutomationApi } from '../lib/task-automation-api';
import type { 
  TaskAutomationScriptsListResponse, 
  UseTaskAutomationScriptsListOptions 
} from '../lib/types';

export function useTaskAutomationScriptsList({ 
  orgId, 
  refreshInterval = 15000 
}: UseTaskAutomationScriptsListOptions) {
  const { data, error, isLoading, mutate } = useSWR<TaskAutomationScriptsListResponse>(
    ['task-automation-scripts-list', orgId],
    () => taskAutomationApi.s3.listScripts(orgId),
    {
      refreshInterval,
      revalidateOnFocus: true,
    },
  );

  return {
    scripts: data?.items || [],
    count: data?.count || 0,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

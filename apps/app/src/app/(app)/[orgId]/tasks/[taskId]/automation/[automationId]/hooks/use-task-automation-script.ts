/**
 * useTaskAutomationScript Hook
 *
 * Manages individual task automation scripts stored in S3.
 * Provides functionality to fetch, cache, and upload automation scripts.
 *
 * @example
 * ```tsx
 * const { script, isLoading, uploadScript } = useTaskAutomationScript({
 *   orgId: 'org_123',
 *   taskId: 'task_456'
 * });
 * ```
 */

import useSWR from 'swr';
import { TaskAutomationScript, UseTaskAutomationScriptOptions } from '../lib';
import { taskAutomationApi } from '../lib/task-automation-api';

export function useTaskAutomationScript({
  orgId,
  taskId,
  automationId,
  enabled = true,
}: UseTaskAutomationScriptOptions) {
  const scriptKey = `${orgId}/${taskId}/${automationId}.draft.js`;

  const { data, error, isLoading, mutate } = useSWR<TaskAutomationScript>(
    enabled ? ['task-automation-script', scriptKey] : null,
    () => taskAutomationApi.s3.getScript(scriptKey) as Promise<TaskAutomationScript>,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: (error) => {
        // Don't retry on 404s
        return error?.message !== 'Script not found';
      },
    },
  );

  return {
    script: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
    refresh: mutate,
    scriptExists: !isLoading && !error && !!data,
  };
}

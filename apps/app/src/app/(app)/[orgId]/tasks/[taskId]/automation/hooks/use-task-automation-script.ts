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

import { useCallback } from 'react';
import useSWR from 'swr';
import { taskAutomationApi } from '../lib/task-automation-api';
import type { TaskAutomationScript, UseTaskAutomationScriptOptions } from '../lib/types';

export function useTaskAutomationScript({
  orgId,
  taskId,
  enabled = true,
}: UseTaskAutomationScriptOptions) {
  const scriptKey = `${orgId}/${taskId}.automation.js`;

  const { data, error, isLoading, mutate } = useSWR<TaskAutomationScript>(
    enabled ? ['task-automation-script', scriptKey] : null,
    () => taskAutomationApi.s3.getScript(scriptKey),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: (error) => {
        // Don't retry on 404s
        return error?.message !== 'Script not found';
      },
    },
  );

  /**
   * Upload a new automation script to S3
   */
  const uploadScript = useCallback(
    async (content: string) => {
      const result = await taskAutomationApi.s3.uploadScript({
        orgId,
        taskId,
        content,
        type: 'automation',
      });

      // Revalidate the cache
      await mutate();

      return result;
    },
    [orgId, taskId, mutate],
  );

  return {
    script: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
    refresh: mutate,
    uploadScript,
    scriptExists: !isLoading && !error && !!data,
  };
}

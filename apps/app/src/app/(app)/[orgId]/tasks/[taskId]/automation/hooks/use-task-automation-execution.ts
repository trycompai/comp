/**
 * useTaskAutomationExecution Hook
 *
 * Handles the execution of task automation scripts via Trigger.dev.
 * Manages execution state, results, and error handling.
 *
 * @example
 * ```tsx
 * const { execute, isExecuting, result, error } = useTaskAutomationExecution({
 *   orgId: 'org_123',
 *   taskId: 'task_456',
 *   onSuccess: (result) => console.log('Success!', result),
 *   onError: (error) => console.error('Failed!', error)
 * });
 *
 * // Execute the script
 * await execute();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { taskAutomationApi } from '../lib/task-automation-api';
import type {
  TaskAutomationExecutionResult,
  UseTaskAutomationExecutionOptions,
} from '../lib/types';

export function useTaskAutomationExecution({
  orgId,
  taskId,
  onSuccess,
  onError,
}: UseTaskAutomationExecutionOptions) {
  const [runId, setRunId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<TaskAutomationExecutionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for run status
  useEffect(() => {
    if (!runId || !isExecuting) return;

    const pollRunStatus = async () => {
      try {
        const response = await fetch(`/api/tasks-automations/runs/${runId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch run status');
        }

        if (data.status === 'COMPLETED' && data.output) {
          // Debug logging
          console.log('[Automation Execution] Raw API response:', data);
          console.log('[Automation Execution] data.output:', data.output);
          console.log('[Automation Execution] data.output.output:', data.output.output);

          const executionResult: TaskAutomationExecutionResult = {
            success: data.output.success,
            data: data.output.output,
            error: data.output.error,
            logs: data.output.logs,
            taskId: data.id,
          };

          // Log the execution result on the client side
          console.log('[Automation Execution] Client received result:', executionResult);

          setResult(executionResult);
          setIsExecuting(false);
          onSuccess?.(executionResult);
        } else if (data.status === 'FAILED') {
          const error = new Error(data.error?.message || 'Task execution failed');
          console.error('[Automation Execution] Client received error:', data.error);
          setError(error);
          setIsExecuting(false);
          onError?.(error);
        } else {
          // Still running, poll again after 1 second
          pollingIntervalRef.current = setTimeout(pollRunStatus, 1000);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to poll run status');
        setError(error);
        setIsExecuting(false);
        onError?.(error);
      }
    };

    // Start polling immediately
    pollRunStatus();

    return () => {
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
      }
    };
  }, [runId, isExecuting, onSuccess, onError]);

  /**
   * Execute the automation script
   */
  const execute = useCallback(async () => {
    setIsExecuting(true);
    setError(null);
    setResult(null);
    setRunId(null);

    try {
      const response = await taskAutomationApi.execution.executeScript({ orgId, taskId });

      // The API now returns a run ID that we can monitor
      if (
        response &&
        typeof response === 'object' &&
        'runId' in response &&
        typeof response.runId === 'string'
      ) {
        setRunId(response.runId);
        return response;
      } else {
        // Handle legacy response format
        setResult(response as TaskAutomationExecutionResult);
        setIsExecuting(false);
        onSuccess?.(response as TaskAutomationExecutionResult);
        return response;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setIsExecuting(false);
      onError?.(error);
      throw error;
    }
  }, [orgId, taskId, onSuccess, onError]);

  /**
   * Reset the execution state
   */
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setRunId(null);
  }, []);

  return {
    execute,
    isExecuting,
    result,
    error,
    reset,
    runId,
  };
}

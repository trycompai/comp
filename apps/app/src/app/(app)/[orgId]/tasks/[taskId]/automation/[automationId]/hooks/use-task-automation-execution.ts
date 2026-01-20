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

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sanitizeErrorMessage } from '../actions/sanitize-error';
import { useSharedChatContext } from '../lib/chat-context';
import { taskAutomationApi } from '../lib/task-automation-api';
import type {
  TaskAutomationExecutionResult,
  UseTaskAutomationExecutionOptions,
} from '../lib/types';

export function useTaskAutomationExecution({
  onSuccess,
  onError,
}: UseTaskAutomationExecutionOptions = {}) {
  const { orgId, taskId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();
  const [runId, setRunId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<TaskAutomationExecutionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Import shared automation ID ref from context
  const { automationIdRef } = useSharedChatContext();

  // Poll for run status
  useEffect(() => {
    if (!runId || !isExecuting) return;

    const pollRunStatus = async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_ENTERPRISE_API_URL}/api/tasks-automations/runs/${runId}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch run status');
        }

        if (data.status === 'COMPLETED' && data.output) {
          // Check both possible error locations:
          // - data.output.error (direct error)
          // - data.output.output.error (nested error from user's script returning {ok: false, error: "..."})
          const rawError = data.output.error || data.output.output?.error;

          // Sanitize if there's an error - makes it user-friendly and removes sensitive data
          const sanitizedError = rawError
            ? await sanitizeErrorMessage(rawError).catch(() => String(rawError))
            : undefined;

          const executionResult: TaskAutomationExecutionResult = {
            success: data.output.success,
            data: data.output.output,
            error: sanitizedError,
            logs: data.output.logs,
            summary: data.output.summary,
            evaluationStatus: data.output.evaluationStatus,
            evaluationReason: data.output.evaluationReason,
            taskId: data.id,
          };

          setResult(executionResult);
          setIsExecuting(false);
          onSuccess?.(executionResult);
        } else if (data.status === 'FAILED') {
          // Log raw error for debugging (internal only)
          console.error('[Automation Execution] Raw error:', data.error);

          // Use AI to sanitize error message with fallback if AI fails
          // Fallback extracts message from error object if available
          const sanitizedMessage = await sanitizeErrorMessage(data.error).catch(() => {
            if (typeof data.error === 'string') return data.error;
            if (data.error?.message) return String(data.error.message);
            return 'The automation failed to execute';
          });
          const error = new Error(sanitizedMessage);

          setError(error);
          setIsExecuting(false);
          onError?.(error);
        } else {
          // Still running, poll again after 1 second
          pollingIntervalRef.current = setTimeout(pollRunStatus, 1000);
        }
      } catch (err) {
        // Sanitize with fallback to ensure state cleanup always happens
        const sanitizedMessage = await sanitizeErrorMessage(err).catch(
          () => (err instanceof Error ? err.message : 'An unexpected error occurred'),
        );
        const error = new Error(sanitizedMessage);
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
      const response = await taskAutomationApi.execution.executeScript({
        orgId,
        taskId,
        automationId: automationIdRef.current,
      });

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
      // Sanitize with fallback to ensure state cleanup always happens
      const sanitizedMessage = await sanitizeErrorMessage(err).catch(
        () => (err instanceof Error ? err.message : 'An unexpected error occurred'),
      );
      const error = new Error(sanitizedMessage);
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

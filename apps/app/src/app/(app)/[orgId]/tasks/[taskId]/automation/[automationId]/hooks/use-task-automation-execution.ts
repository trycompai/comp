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
import { getAutomationRunStatus } from '../actions/task-automation-actions';
import { useSharedChatContext } from '../lib/chat-context';
import { taskAutomationApi } from '../lib/task-automation-api';
import type {
  TaskAutomationExecutionResult,
  UseTaskAutomationExecutionOptions,
} from '../lib/types';

interface AutomationRunData {
  id: string;
  status: string;
  error?: unknown;
  output?: {
    success: boolean;
    error?: unknown;
    output?: Record<string, unknown>;
    summary?: string;
    evaluationStatus?: 'fail' | 'pass';
    evaluationReason?: string;
  };
}

// Trigger.dev run statuses that mean the run is still in progress. Anything
// NOT in this set is terminal (the run has stopped for good). Keeping a run
// status outside both this set and COMPLETED used to fall through to an
// infinite poll, which is exactly what hung the "Running your automation"
// dialog. Source: @trigger.dev/sdk v4 RunStatus.
const IN_PROGRESS_RUN_STATUSES = new Set<string>([
  'PENDING_VERSION',
  'QUEUED',
  'DEQUEUED',
  'EXECUTING',
  'WAITING',
  'DELAYED',
]);

// Friendly messages for terminal run states that are not a clean COMPLETED and
// usually don't carry a script-level error (timeouts, crashes, cancellations).
const TERMINAL_STATUS_MESSAGES: Record<string, string> = {
  TIMED_OUT:
    'The automation took too long and timed out before it could finish. Try simplifying the script or check any external services it calls.',
  CRASHED: 'The automation crashed while running. This is usually temporary — please try again.',
  SYSTEM_FAILURE:
    'The automation stopped because of a system error. Please try again in a moment.',
  CANCELED: 'The automation run was canceled before it finished.',
  EXPIRED: 'The automation expired before it could start. Please try again.',
};

// Absolute ceiling on how long we keep polling before surfacing a result, so
// the dialog can never spin forever (e.g. a run stuck in the queue that never
// reaches a terminal state). Comfortably above the backend task's 5-minute
// maxDuration.
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

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

    // Absolute deadline for this run. Stable for the lifetime of the effect —
    // it only restarts when a new run begins (runId/isExecuting change).
    const pollDeadline = Date.now() + POLL_TIMEOUT_MS;

    const finishWithSuccess = (data: AutomationRunData, sanitizedError?: string) => {
      const output = data.output;
      const executionResult: TaskAutomationExecutionResult = {
        // A COMPLETED run is a successful execution; default to true if the
        // wrapper output is somehow missing (e.g. output too large to inline).
        success: output?.success ?? true,
        data: output?.output,
        error: sanitizedError,
        logs: [], // Don't expose internal execution logs to users
        summary: output?.summary,
        evaluationStatus: output?.evaluationStatus,
        evaluationReason: output?.evaluationReason,
        taskId: data.id,
      };

      setResult(executionResult);
      setIsExecuting(false);
      onSuccess?.(executionResult);
    };

    const finishWithError = (message: string) => {
      const failure = new Error(message);
      setError(failure);
      setIsExecuting(false);
      onError?.(failure);
    };

    const pollRunStatus = async () => {
      try {
        const res = await getAutomationRunStatus(runId);
        if (!res.success) {
          throw new Error(res.error || 'Failed to fetch run status');
        }
        const data = res.data as AutomationRunData;

        // Terminal success.
        if (data.status === 'COMPLETED') {
          // Check both possible error locations:
          // - data.output.error (direct error)
          // - data.output.output.error (nested error from user's script returning {ok: false, error: "..."})
          const rawError = data.output?.error || data.output?.output?.error;

          // Sanitize if there's an error - makes it user-friendly and removes sensitive data
          const sanitizedError = rawError
            ? await sanitizeErrorMessage(rawError).catch(() => String(rawError))
            : undefined;

          finishWithSuccess(data, sanitizedError);
          return;
        }

        // Still running — keep polling, but never past the absolute deadline.
        // This is the only branch that re-schedules a poll, so a run that gets
        // stuck in the queue can no longer spin the dialog forever.
        if (IN_PROGRESS_RUN_STATUSES.has(data.status)) {
          if (Date.now() >= pollDeadline) {
            finishWithError(
              'The automation is taking longer than expected and may still be running in the background. Close this dialog and check back shortly.',
            );
            return;
          }
          pollingIntervalRef.current = setTimeout(pollRunStatus, 1000);
          return;
        }

        // Terminal but NOT COMPLETED: FAILED / CANCELED / CRASHED /
        // SYSTEM_FAILURE / EXPIRED / TIMED_OUT (or any unknown status we treat
        // as terminal). Previously these fell through to an infinite poll —
        // surface a clear error instead.
        console.error(
          `[Automation Execution] Run ended in non-success state "${data.status}":`,
          data.error,
        );

        // A script-level failure (FAILED) carries the real error in data.error,
        // so sanitize it for the user. Other terminal states rarely do, so fall
        // back to a friendly status-specific message.
        const rawErr = data.error;
        const statusMessage =
          TERMINAL_STATUS_MESSAGES[data.status] ??
          'The automation did not finish successfully. Please try again.';
        const message = rawErr
          ? await sanitizeErrorMessage(rawErr).catch(() => {
              if (typeof rawErr === 'string') return rawErr;
              if (rawErr && typeof rawErr === 'object' && 'message' in rawErr) {
                return String((rawErr as { message: unknown }).message);
              }
              return statusMessage;
            })
          : statusMessage;

        finishWithError(message);
      } catch (err) {
        // Sanitize with fallback to ensure state cleanup always happens
        const sanitizedMessage = await sanitizeErrorMessage(err).catch(() =>
          err instanceof Error ? err.message : 'An unexpected error occurred',
        );
        finishWithError(sanitizedMessage);
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
        // No runId — treat as immediate completion
        setIsExecuting(false);
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

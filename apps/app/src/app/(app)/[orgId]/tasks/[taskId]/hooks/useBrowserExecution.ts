'use client';

import { apiClient } from '@/lib/api-client';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FAILED_RUN_STATUSES } from '../components/browser-automations/connect-flow-constants';
import type { SignInStep } from '../components/browser-automations/StepList';
import type { ExecuteResponse, StartLiveResponse } from './types';

interface UseBrowserExecutionOptions {
  onNeedsReauth: (automationId: string) => void;
  onComplete: () => void;
}

/** Realtime handle for the background run the live view subscribes to. */
interface LiveHandle {
  runId: string;
  accessToken: string;
}

export function useBrowserExecution({ onNeedsReauth, onComplete }: UseBrowserExecutionOptions) {
  const [runningAutomationId, setRunningAutomationId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [liveHandle, setLiveHandle] = useState<LiveHandle | null>(null);

  // Same realtime mechanism the composer's Test panel uses: the background run
  // publishes its step timeline to `runSteps`, which we surface to the live view.
  const { run: runState, error: runError } = useRealtimeRun(liveHandle?.runId ?? '', {
    accessToken: liveHandle?.accessToken,
    enabled: !!liveHandle,
  });

  const steps = (runState?.metadata?.runSteps as SignInStep[] | undefined) ?? [];

  // Follow each vendor's live view: the task streams the current step's live
  // URL, so the iframe moves from vendor to vendor instead of showing only the
  // first. (start-live seeds the initial view; this swaps it as steps advance.)
  const streamedLiveView = runState?.metadata?.liveViewUrl as string | undefined;
  useEffect(() => {
    if (streamedLiveView) setLiveViewUrl(streamedLiveView);
  }, [streamedLiveView]);

  const closeSession = useCallback(async (id: string) => {
    try {
      await apiClient.post('/v1/browserbase/session/close', { sessionId: id });
    } catch {
      // Ignore cleanup errors (don't block the UI).
    }
  }, []);

  const reset = useCallback(() => {
    setLiveViewUrl(null);
    setSessionId(null);
    setIsExecuting(false);
    setRunningAutomationId(null);
    setLiveHandle(null);
  }, []);

  const runAutomation = useCallback(
    async (automationId: string) => {
      setRunningAutomationId(automationId);
      let startedSessionId: string | null = null;
      try {
        // Step 1: start a live session (creates the run + live view URL).
        const startRes = await apiClient.post<StartLiveResponse>(
          `/v1/browserbase/automations/${automationId}/start-live`,
          {},
        );

        if (startRes.data?.needsReauth) {
          toast.error('Session expired. Please re-authenticate below.');
          onNeedsReauth(automationId);
          setRunningAutomationId(null);
          return;
        }
        if (startRes.error || !startRes.data?.sessionId) {
          throw new Error(startRes.error || startRes.data?.error || 'Failed to start automation');
        }

        startedSessionId = startRes.data.sessionId;
        setSessionId(startedSessionId);
        setLiveViewUrl(startRes.data.liveViewUrl);
        setIsExecuting(true);

        // Step 2: kick off the run as a background task and subscribe to it for
        // live steps + the final result (instead of blocking on one response).
        const execRes = await apiClient.post<{ runId: string; publicAccessToken: string }>(
          `/v1/browserbase/automations/${automationId}/execute-live`,
          { runId: startRes.data.runId, sessionId: startedSessionId },
        );
        if (execRes.error || !execRes.data?.runId) {
          throw new Error(execRes.error || 'Failed to start the run');
        }
        setLiveHandle({
          runId: execRes.data.runId,
          accessToken: execRes.data.publicAccessToken,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to run automation');
        reset();
        if (startedSessionId) void closeSession(startedSessionId);
        onComplete();
      }
    },
    [onNeedsReauth, onComplete, reset, closeSession],
  );

  // Finalize when the background run reaches a terminal state (realtime has no
  // onError/onComplete — watch run.status + error, per the composer pattern).
  useEffect(() => {
    if (!liveHandle) return;
    if (runState && runState.id !== liveHandle.runId) return;

    const finalize = (ok: boolean, message?: string) => {
      if (ok) toast.success('Automation completed successfully');
      else toast.error(message || 'Automation failed');
      if (sessionId) void closeSession(sessionId);
      reset();
      onComplete();
    };

    if (runError) {
      finalize(false, 'The run could not complete.');
      return;
    }
    if (!runState) return;

    if (runState.status === 'COMPLETED') {
      const output = runState.output as ExecuteResponse | undefined;
      finalize(output?.success ?? false, output?.error);
    } else if (FAILED_RUN_STATUSES.has(runState.status)) {
      finalize(
        false,
        runState.status === 'TIMED_OUT'
          ? 'The AI ran out of time before finishing.'
          : 'The run could not complete.',
      );
    }
  }, [liveHandle, runState, runError, sessionId, closeSession, reset, onComplete]);

  const cancelExecution = useCallback(async () => {
    if (sessionId) void closeSession(sessionId);
    reset();
    onComplete();
  }, [sessionId, closeSession, reset, onComplete]);

  return {
    runningAutomationId,
    liveViewUrl,
    isExecuting,
    steps,
    runAutomation,
    cancelExecution,
  };
}

'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { ExecuteResponse, StartLiveResponse } from './types';

interface UseBrowserExecutionOptions {
  organizationId: string;
  onNeedsReauth: () => void;
  onComplete: () => void;
}

export function useBrowserExecution({
  organizationId,
  onNeedsReauth,
  onComplete,
}: UseBrowserExecutionOptions) {
  const [runningAutomationId, setRunningAutomationId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const runAutomation = useCallback(
    async (automationId: string) => {
      setRunningAutomationId(automationId);
      let startedSessionId: string | null = null;

      try {
        // Step 1: Start automation with live view
        const startRes = await apiClient.post<StartLiveResponse>(
          `/v1/browserbase/automations/${automationId}/start-live`,
          {},
          organizationId,
        );

        if (startRes.data?.needsReauth) {
          toast.error('Session expired. Please re-authenticate below.');
          onNeedsReauth();
          return;
        }

        if (startRes.error || !startRes.data?.sessionId) {
          throw new Error(startRes.error || startRes.data?.error || 'Failed to start automation');
        }

        startedSessionId = startRes.data.sessionId;

        // Show the live view
        setRunId(startRes.data.runId);
        setSessionId(startedSessionId);
        setLiveViewUrl(startRes.data.liveViewUrl);
        setIsExecuting(true);

        // Step 2: Execute the automation (runs in background while user watches)
        const execRes = await apiClient.post<ExecuteResponse>(
          `/v1/browserbase/automations/${automationId}/execute`,
          {
            runId: startRes.data.runId,
            sessionId: startedSessionId,
          },
          organizationId,
        );

        if (execRes.data?.success) {
          toast.success('Automation completed successfully');
        } else {
          toast.error(execRes.data?.error || 'Automation failed');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to run automation');
      } finally {
        // Clear execution state immediately (UI), then best-effort close the session to avoid leaks
        setLiveViewUrl(null);
        setSessionId(null);
        setRunId(null);
        setIsExecuting(false);
        setRunningAutomationId(null);

        if (startedSessionId) {
          try {
            await apiClient.post(
              '/v1/browserbase/session/close',
              { sessionId: startedSessionId },
              organizationId,
            );
          } catch {
            // Ignore cleanup errors (don't block UI / don't mask original error)
          }
        }

        // Always refresh after any run attempt (success/failure/exception) so the UI doesn't
        // get stuck showing the old "running" run until a full page refresh.
        onComplete();
      }
    },
    [organizationId, onNeedsReauth, onComplete],
  );

  const cancelExecution = useCallback(async () => {
    if (sessionId) {
      try {
        await apiClient.post('/v1/browserbase/session/close', { sessionId }, organizationId);
      } catch {
        // Ignore
      }
    }
    setLiveViewUrl(null);
    setSessionId(null);
    setRunId(null);
    setIsExecuting(false);
    setRunningAutomationId(null);
    onComplete();
  }, [sessionId, organizationId, onComplete]);

  return {
    runningAutomationId,
    liveViewUrl,
    isExecuting,
    runAutomation,
    cancelExecution,
  };
}

'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface InstructionTestHandle {
  runId: string;
  publicAccessToken: string;
  /** Session the test runs on — shown as a live view to watch. */
  sessionId: string;
  liveViewUrl: string;
}

/**
 * Coach loop: run a not-yet-saved instruction against the connection's live
 * session so the user can watch it before saving. Returns a handle to subscribe
 * to (live steps + final result), or null on failure. Nothing is persisted.
 */
export function useInstructionTest() {
  const [isStarting, setIsStarting] = useState(false);

  const startTest = useCallback(
    async (input: {
      profileId?: string;
      targetUrl: string;
      instruction: string;
      evaluationCriteria?: string;
      taskId?: string;
    }): Promise<InstructionTestHandle | null> => {
      setIsStarting(true);
      try {
        const res = await apiClient.post<InstructionTestHandle>(
          '/v1/browserbase/automations/test',
          input,
        );
        if (res.error || !res.data?.runId) {
          toast.error(res.error || 'Could not start the test run.');
          return null;
        }
        return res.data;
      } catch {
        toast.error('Could not start the test run.');
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [],
  );

  /** Best-effort release of the live session backing a test run. */
  const closeTestSession = useCallback(async (sessionId: string) => {
    try {
      await apiClient.post('/v1/browserbase/session/close', { sessionId });
    } catch {
      // Ignore cleanup errors.
    }
  }, []);

  return { startTest, closeTestSession, isStarting };
}

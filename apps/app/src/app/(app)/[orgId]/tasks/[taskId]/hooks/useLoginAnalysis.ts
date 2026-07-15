'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface AnalysisRunHandle {
  runId: string;
  publicAccessToken: string;
}

/**
 * Kicks off vendor login analysis as a background Trigger.dev run and returns a
 * handle to subscribe to. The browser + AI work runs off the request path, so it
 * can't be cut short by an HTTP or browser timeout. Returns null on failure.
 */
export function useLoginAnalysis() {
  const [isStarting, setIsStarting] = useState(false);

  const startAnalysis = useCallback(
    async (url: string): Promise<AnalysisRunHandle | null> => {
      setIsStarting(true);
      try {
        const res = await apiClient.post<AnalysisRunHandle>(
          '/v1/browserbase/analyze-login',
          { url },
        );
        if (res.error || !res.data?.runId) {
          toast.error(res.error || 'Could not start the sign-in check.');
          return null;
        }
        return res.data;
      } catch {
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [],
  );

  return { startAnalysis, isStarting };
}

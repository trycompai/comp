'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { LoginAnalysis } from './types';

/**
 * Asks the API to open a vendor sign-in page and detect which login methods it
 * supports, so the connect flow can recommend the most reliable setup. Returns
 * null on failure (the caller falls back to manual entry).
 */
export function useLoginAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = useCallback(async (url: string): Promise<LoginAnalysis | null> => {
    setIsAnalyzing(true);
    try {
      const res = await apiClient.post<LoginAnalysis>('/v1/browserbase/analyze-login', { url });
      if (res.error || !res.data) {
        toast.error(res.error || 'Could not read the sign-in page.');
        return null;
      }
      return res.data;
    } catch {
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyze, isAnalyzing };
}

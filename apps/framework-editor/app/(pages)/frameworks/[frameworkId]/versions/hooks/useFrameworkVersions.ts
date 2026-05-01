'use client';

import { apiClient } from '@/app/lib/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface FrameworkVersionListItem {
  id: string;
  version: string;
  publishedAt: string;
  publishedById: string | null;
  publishedBy: { id: string; name: string; email: string } | null;
  releaseNotes: string | null;
}

export function useFrameworkVersions(frameworkId: string) {
  const [data, setData] = useState<FrameworkVersionListItem[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Monotonic request id. If a newer fetch has been kicked off by the time an
  // older one resolves, the older response is dropped — prevents an earlier
  // refetch from overwriting a newer result with stale data.
  const latestRequestId = useRef(0);

  const fetchVersions = useCallback(async () => {
    if (!frameworkId) return;
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient<{ data: FrameworkVersionListItem[]; count?: number }>(
        `/framework/${frameworkId}/versions`,
      );
      if (requestId !== latestRequestId.current) return;
      setData(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err instanceof Error ? err : new Error('Failed to fetch versions'));
    } finally {
      if (requestId === latestRequestId.current) setIsLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    void fetchVersions();
  }, [fetchVersions]);

  return { data, isLoading, error, refetch: fetchVersions };
}

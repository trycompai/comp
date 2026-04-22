'use client';

import { apiClient } from '@/app/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

export interface FrameworkVersionListItem {
  id: string;
  version: string;
  publishedAt: string;
  publishedById: string | null;
  releaseNotes: string | null;
}

export function useFrameworkVersions(frameworkId: string) {
  const [data, setData] = useState<FrameworkVersionListItem[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!frameworkId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient<FrameworkVersionListItem[]>(
        `/framework/${frameworkId}/versions`,
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch versions'));
    } finally {
      setIsLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    void fetchVersions();
  }, [fetchVersions]);

  return { data, isLoading, error, refetch: fetchVersions };
}

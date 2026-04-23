'use client';

import { apiClient } from '@/app/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

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

  const fetchVersions = useCallback(async () => {
    if (!frameworkId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient<{ data: FrameworkVersionListItem[]; count?: number }>(
        `/framework/${frameworkId}/versions`,
      );
      setData(Array.isArray(result?.data) ? result.data : []);
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

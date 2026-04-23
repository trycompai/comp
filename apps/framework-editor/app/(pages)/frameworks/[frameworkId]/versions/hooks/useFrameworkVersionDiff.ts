'use client';

import { apiClient } from '@/app/lib/api-client';
import { useCallback, useEffect, useState } from 'react';
import type { DraftDiff } from './useFrameworkDraftDiff';

/**
 * Diff of a specific published version against the version published
 * immediately before it (or an empty manifest if it's the first version).
 * Shape mirrors DraftDiff for the diff/linkChanges portions so the same
 * VersionDiffView component renders both.
 */
export interface VersionDiffResponse {
  version: {
    id: string;
    version: string;
    publishedAt: string;
    releaseNotes: string | null;
  };
  previousVersion: { id: string; version: string } | null;
  diff: DraftDiff['diff'];
  linkChanges: DraftDiff['linkChanges'];
}

export function useFrameworkVersionDiff(frameworkId: string, versionId: string) {
  const [data, setData] = useState<VersionDiffResponse | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDiff = useCallback(async () => {
    if (!frameworkId || !versionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient<{ data: VersionDiffResponse }>(
        `/framework/${frameworkId}/versions/${versionId}/diff`,
      );
      setData(result?.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch version diff'));
    } finally {
      setIsLoading(false);
    }
  }, [frameworkId, versionId]);

  useEffect(() => {
    void fetchDiff();
  }, [fetchDiff]);

  return { data, isLoading, error, refetch: fetchDiff };
}

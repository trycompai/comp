'use client';

import { apiClient } from '@/app/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

export interface EntityDiffCounts {
  added: unknown[];
  removed: unknown[];
  updated: unknown[];
}

export interface EdgeDiffCounts {
  added: unknown[];
  removed: unknown[];
}

export interface DraftDiff {
  latestVersion: { id: string; version: string } | null;
  diff: {
    controls: EntityDiffCounts;
    requirements: EntityDiffCounts;
    policies: EntityDiffCounts;
    tasks: EntityDiffCounts;
    requirementMapEdges: EdgeDiffCounts;
    controlPolicyEdges: EdgeDiffCounts;
    controlTaskEdges: EdgeDiffCounts;
    controlDocumentTypeEdges?: EdgeDiffCounts;
  };
}

export function useFrameworkDraftDiff(
  frameworkId: string,
  options?: { enabled?: boolean },
) {
  const [data, setData] = useState<DraftDiff | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled !== false;

  const fetchDiff = useCallback(async () => {
    if (!frameworkId || !enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient<{ data: DraftDiff }>(
        `/framework/${frameworkId}/draft-diff`,
      );
      setData(result?.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch draft diff'));
    } finally {
      setIsLoading(false);
    }
  }, [frameworkId, enabled]);

  useEffect(() => {
    void fetchDiff();
  }, [fetchDiff]);

  return { data, isLoading, error, refetch: fetchDiff };
}

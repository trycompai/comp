'use client';

import { apiClient } from '@/app/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

export interface DiffControl {
  id: string;
  name: string;
  description?: string;
  controlFamily?: string | null;
}

export interface DiffRequirement {
  id: string;
  name: string;
  identifier: string;
  description?: string | null;
  requirementFamily?: string | null;
}

export interface DiffPolicy {
  id: string;
  name: string;
  description?: string | null;
}

export interface DiffTask {
  id: string;
  name: string;
  description?: string;
}

export interface EntityDiffCounts<T = unknown> {
  added: T[];
  removed: T[];
  updated: Array<{ id: string; from: T; to: T }>;
}

export interface EdgeDiffCounts {
  added: Array<{ controlTemplateId: string; [k: string]: string | undefined }>;
  removed: Array<{ controlTemplateId: string; [k: string]: string | undefined }>;
}

export interface DraftDiff {
  latestVersion: { id: string; version: string } | null;
  diff: {
    controls: EntityDiffCounts<DiffControl>;
    requirements: EntityDiffCounts<DiffRequirement>;
    policies: EntityDiffCounts<DiffPolicy>;
    tasks: EntityDiffCounts<DiffTask>;
    requirementMapEdges: EdgeDiffCounts;
    controlPolicyEdges: EdgeDiffCounts;
    controlTaskEdges: EdgeDiffCounts;
    controlDocumentTypeEdges?: EdgeDiffCounts;
  };
  linkChanges?: {
    controlRequirement: {
      added: Array<{
        controlName: string;
        requirementName: string;
        requirementIdentifier: string;
      }>;
      removed: Array<{
        controlName: string;
        requirementName: string;
        requirementIdentifier: string;
      }>;
    };
    controlPolicy: {
      added: Array<{ controlName: string; policyName: string }>;
      removed: Array<{ controlName: string; policyName: string }>;
    };
    controlTask: {
      added: Array<{ controlName: string; taskName: string }>;
      removed: Array<{ controlName: string; taskName: string }>;
    };
    controlDocumentType: {
      added: Array<{ controlName: string; formType: string }>;
      removed: Array<{ controlName: string; formType: string }>;
    };
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

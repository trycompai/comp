'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

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
  };
}

interface UseFrameworkDraftDiffOptions {
  enabled?: boolean;
}

export function useFrameworkDraftDiff(
  frameworkId: string,
  options?: UseFrameworkDraftDiffOptions,
) {
  const key =
    frameworkId && options?.enabled !== false
      ? `/v1/framework-editor/framework/${frameworkId}/draft-diff`
      : null;

  return useSWR<DraftDiff>(
    key,
    async (url: string) => {
      const res = await apiClient.get<{ data: DraftDiff }>(url);
      if (res.error) throw new Error(res.error);
      return res.data?.data as DraftDiff;
    },
    {
      revalidateOnFocus: false,
    },
  );
}

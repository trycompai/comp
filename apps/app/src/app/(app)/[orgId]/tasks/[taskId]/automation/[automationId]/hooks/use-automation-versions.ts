import { api } from '@/lib/api-client';
import { EvidenceAutomationVersion } from '@db';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import useSWR from 'swr';

interface UseAutomationVersionsOptions {
  /**
   * Number of versions to fetch per page
   * @default 10
   */
  pageSize?: number;
  /**
   * Initial versions from server-side render (prevents loading flicker)
   */
  initialData?: EvidenceAutomationVersion[];
}

interface UseAutomationVersionsReturn {
  /** Accumulated array of all loaded versions (sorted desc by version number) */
  versions: EvidenceAutomationVersion[];
  /** True while fetching initial page or loading more */
  isLoading: boolean;
  /** True if fetch failed */
  isError: boolean;
  /** Error object if fetch failed */
  error: Error | undefined;
  /** True if more versions exist that haven't been loaded yet */
  hasMore: boolean;
  /** Fetch the next page of versions (increments offset by pageSize) */
  loadMore: () => Promise<void>;
  /** Revalidate/refresh the versions list */
  mutate: () => Promise<any>;
}

/**
 * Fetch automation versions with infinite scroll pagination
 *
 * **Behavior:**
 * - Initial load: Fetches first `pageSize` versions (default 10)
 * - Incremental loading: Call `loadMore()` to fetch next page
 * - Accumulation: New versions append to existing array
 * - Smart detection: Sets `hasMore=false` when fewer than `pageSize` returned
 * - Sorted: Versions returned in descending order (newest first)
 *
 * **Example:**
 * ```tsx
 * const { versions, hasMore, loadMore } = useAutomationVersions();
 * // versions = [v10, v9, v8, v7, v6, v5, v4, v3, v2, v1]
 *
 * await loadMore(); // Fetches next 10
 * // versions = [v10, v9, ..., v1] (accumulated)
 * ```
 *
 * **Scalability:**
 * - Handles 500+ versions efficiently
 * - Only fetches what's needed
 * - SWR caching per offset
 *
 * @param options - Configuration options
 * @param options.pageSize - Number of versions per page (default: 10)
 * @returns Version data, loading state, and loadMore function
 */
export function useAutomationVersions(
  options: UseAutomationVersionsOptions = {},
): UseAutomationVersionsReturn {
  const { pageSize = 10, initialData = [] } = options;

  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  const [allVersions, setAllVersions] = useState<EvidenceAutomationVersion[]>(initialData);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(initialData.length === pageSize);

  const { data, error, isLoading, mutate } = useSWR(
    [`automation-versions-${automationId}-${offset}`, orgId, taskId, automationId, offset],
    async () => {
      const url = `/v1/tasks/${taskId}/automations/${automationId}/versions?limit=${pageSize}&offset=${offset}`;
      const response = await api.get<{
        success: boolean;
        versions: EvidenceAutomationVersion[];
      }>(url, orgId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to fetch versions');
      }

      return response.data.versions;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 0,
      onSuccess: (newVersions) => {
        // Append new versions to existing ones
        if (offset === 0) {
          setAllVersions(newVersions);
        } else {
          setAllVersions((prev) => [...prev, ...newVersions]);
        }

        // If we got fewer than pageSize, no more to load
        setHasMore(newVersions.length === pageSize);
      },
    },
  );

  const loadMore = useCallback(async () => {
    setOffset((prev) => prev + pageSize);
  }, [pageSize]);

  return {
    versions: allVersions,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    hasMore,
    loadMore,
    mutate,
  };
}

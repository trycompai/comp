'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { SyncHistoryItem } from '@/types/framework-versioning';

interface UseFrameworkSyncHistoryOptions {
  fallbackData?: SyncHistoryItem[];
  enabled?: boolean;
}

export function useFrameworkSyncHistory(
  frameworkInstanceId: string,
  options?: UseFrameworkSyncHistoryOptions,
) {
  const key =
    frameworkInstanceId && options?.enabled !== false
      ? `/v1/frameworks/${frameworkInstanceId}/sync-history`
      : null;

  return useSWR<SyncHistoryItem[]>(
    key,
    async (url: string) => {
      const res = await apiClient.get<{ data: SyncHistoryItem[] }>(url);
      if (res.error) throw new Error(res.error);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    {
      fallbackData: options?.fallbackData,
      revalidateOnMount: !options?.fallbackData,
      revalidateOnFocus: false,
    },
  );
}

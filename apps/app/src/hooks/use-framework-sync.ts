'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { mutate } from 'swr';
import { FRAMEWORK_UPDATE_STATUSES_KEY } from './use-framework-update-statuses';

interface SyncResult {
  syncOperationId: string;
}

export function useFrameworkSync(frameworkInstanceId: string) {
  const [isSyncing, setIsSyncing] = useState(false);

  async function sync(targetVersionId: string): Promise<SyncResult> {
    setIsSyncing(true);
    try {
      const res = await apiClient.post<{ data: SyncResult }>(
        `/v1/frameworks/${frameworkInstanceId}/sync`,
        { targetVersionId },
      );
      if (res.error) throw new Error(res.error);
      // Clear the preview cache without refetching — after a successful sync
      // the instance is at the latest version, so /update-preview would 404.
      await mutate(
        `/v1/frameworks/${frameworkInstanceId}/update-preview`,
        undefined,
        { revalidate: false },
      );
      await Promise.all([
        mutate(`/v1/frameworks/${frameworkInstanceId}/update-status`),
        mutate(`/v1/frameworks/${frameworkInstanceId}/sync-history`),
        mutate(`/v1/frameworks/${frameworkInstanceId}`),
        mutate(FRAMEWORK_UPDATE_STATUSES_KEY),
      ]);
      return res.data?.data as SyncResult;
    } finally {
      setIsSyncing(false);
    }
  }

  return { sync, isSyncing };
}

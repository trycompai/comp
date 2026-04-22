'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { mutate } from 'swr';

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
      await Promise.all([
        mutate(`/v1/frameworks/${frameworkInstanceId}/update-status`),
        mutate(`/v1/frameworks/${frameworkInstanceId}/update-preview`),
        mutate(`/v1/frameworks/${frameworkInstanceId}/sync-history`),
        mutate(`/v1/frameworks/${frameworkInstanceId}`),
      ]);
      return res.data?.data as SyncResult;
    } finally {
      setIsSyncing(false);
    }
  }

  return { sync, isSyncing };
}

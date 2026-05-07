'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { mutate } from 'swr';
import { FRAMEWORK_UPDATE_STATUSES_KEY } from './use-framework-update-statuses';

interface RollbackResult {
  rollbackOperationId: string;
}

export function useFrameworkRollback(frameworkInstanceId: string) {
  const [isRollingBack, setIsRollingBack] = useState(false);

  async function rollback(syncOperationId: string): Promise<RollbackResult> {
    setIsRollingBack(true);
    try {
      const res = await apiClient.post<{ data: RollbackResult }>(
        `/v1/frameworks/${frameworkInstanceId}/rollback`,
        { syncOperationId },
      );
      if (res.error) throw new Error(res.error);
      await Promise.all([
        mutate(`/v1/frameworks/${frameworkInstanceId}/update-status`),
        mutate(`/v1/frameworks/${frameworkInstanceId}/update-preview`),
        mutate(`/v1/frameworks/${frameworkInstanceId}/sync-history`),
        mutate(`/v1/frameworks/${frameworkInstanceId}`),
        mutate(FRAMEWORK_UPDATE_STATUSES_KEY),
      ]);
      return res.data?.data as RollbackResult;
    } finally {
      setIsRollingBack(false);
    }
  }

  return { rollback, isRollingBack };
}

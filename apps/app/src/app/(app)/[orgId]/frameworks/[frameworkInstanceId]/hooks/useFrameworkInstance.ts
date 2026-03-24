'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { FrameworkInstanceDetail } from '../../types';

export function useFrameworkInstance(frameworkInstanceId: string) {
  const { data, error, isLoading, mutate } = useSWR<FrameworkInstanceDetail>(
    `/v1/frameworks/${frameworkInstanceId}`,
    async (url: string) => {
      const res = await apiClient.get<FrameworkInstanceDetail>(url);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  );

  return { data, error, isLoading, mutate };
}

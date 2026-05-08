'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

export function useFrameworkInstance<T = any>(
  frameworkInstanceId: string,
  options?: { fallbackData?: T },
) {
  return useSWR<T>(
    frameworkInstanceId ? `/v1/frameworks/${frameworkInstanceId}` : null,
    async (url) => {
      const res = await apiClient.get(url);
      if (res.error) throw new Error(res.error);
      return res.data as T;
    },
    {
      fallbackData: options?.fallbackData,
      revalidateOnMount: !options?.fallbackData,
      revalidateOnFocus: true,
    },
  );
}

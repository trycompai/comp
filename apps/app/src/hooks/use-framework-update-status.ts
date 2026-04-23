'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { FrameworkUpdateStatus } from '@/types/framework-versioning';

interface UseFrameworkUpdateStatusOptions {
  fallbackData?: FrameworkUpdateStatus;
  enabled?: boolean;
}

export function useFrameworkUpdateStatus(
  frameworkInstanceId: string,
  options?: UseFrameworkUpdateStatusOptions,
) {
  const key =
    frameworkInstanceId && options?.enabled !== false
      ? `/v1/frameworks/${frameworkInstanceId}/update-status`
      : null;

  return useSWR<FrameworkUpdateStatus>(
    key,
    async (url: string) => {
      const res = await apiClient.get<{ data: FrameworkUpdateStatus }>(url);
      if (res.error) throw new Error(res.error);
      return res.data?.data as FrameworkUpdateStatus;
    },
    {
      fallbackData: options?.fallbackData,
      revalidateOnMount: !options?.fallbackData,
      revalidateOnFocus: true,
    },
  );
}

'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { UpdatePreview } from '@/types/framework-versioning';

interface UseFrameworkUpdatePreviewOptions {
  fallbackData?: UpdatePreview;
  enabled?: boolean;
}

export function useFrameworkUpdatePreview(
  frameworkInstanceId: string,
  options?: UseFrameworkUpdatePreviewOptions,
) {
  const key =
    frameworkInstanceId && options?.enabled !== false
      ? `/v1/frameworks/${frameworkInstanceId}/update-preview`
      : null;

  return useSWR<UpdatePreview>(
    key,
    async (url: string) => {
      const res = await apiClient.get<{ data: UpdatePreview }>(url);
      if (res.error) throw new Error(res.error);
      return res.data?.data as UpdatePreview;
    },
    {
      fallbackData: options?.fallbackData,
      revalidateOnMount: !options?.fallbackData,
      revalidateOnFocus: false,
    },
  );
}

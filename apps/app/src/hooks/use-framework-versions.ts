'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

export interface FrameworkVersionListItem {
  id: string;
  version: string;
  publishedAt: string;
  publishedById: string | null;
  releaseNotes: string | null;
}

interface UseFrameworkVersionsOptions {
  fallbackData?: FrameworkVersionListItem[];
  enabled?: boolean;
}

export function useFrameworkVersions(
  frameworkId: string,
  options?: UseFrameworkVersionsOptions,
) {
  const key =
    frameworkId && options?.enabled !== false
      ? `/v1/framework-editor/framework/${frameworkId}/versions`
      : null;

  return useSWR<FrameworkVersionListItem[]>(
    key,
    async (url: string) => {
      const res = await apiClient.get<{ data: FrameworkVersionListItem[] }>(url);
      if (res.error) throw new Error(res.error);
      return res.data?.data ?? [];
    },
    {
      fallbackData: options?.fallbackData,
      revalidateOnMount: !options?.fallbackData,
      revalidateOnFocus: false,
    },
  );
}

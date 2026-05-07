'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

export const FRAMEWORK_UPDATE_STATUSES_KEY = '/v1/frameworks/update-statuses';

export interface FrameworkUpdateStatusItem {
  frameworkInstanceId: string;
  frameworkName: string | null;
  currentVersion: { id: string; version: string } | null;
  latestVersion: {
    id: string;
    version: string;
    publishedAt: string;
    releaseNotes: string | null;
  } | null;
  updateAvailable: boolean;
}

export function useFrameworkUpdateStatuses() {
  return useSWR<FrameworkUpdateStatusItem[]>(
    FRAMEWORK_UPDATE_STATUSES_KEY,
    async (url: string) => {
      const res = await apiClient.get<{ data: FrameworkUpdateStatusItem[] }>(url);
      if (res.error) throw new Error(res.error);
      return res.data?.data ?? [];
    },
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
    },
  );
}

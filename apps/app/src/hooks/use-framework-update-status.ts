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
      // Always revalidate on mount, even when fallbackData is provided.
      // fallbackData is only a fast first paint — without this, SWR treats
      // the server-rendered snapshot as authoritative forever and skips the
      // client fetch, so users don't see newly-available upgrades after the
      // feature flag is flipped, after a sync on a sibling framework, or
      // whenever the Next.js router cache serves a stale RSC. Short of
      // signing out and back in.
      revalidateOnMount: true,
      revalidateOnFocus: true,
    },
  );
}

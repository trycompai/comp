'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

/**
 * Automatic-2FA status for every password connection in the org, keyed by
 * connection id, in one round-trip — so the connections list can show which
 * sign-ins stay signed in on their own and which may pause. Read live from the
 * vault; pass `enabled` to hold the fetch until it's needed.
 */
export function useTotpStatuses(enabled: boolean) {
  const { data, isLoading, mutate } = useSWR<Record<string, boolean>>(
    enabled ? ['totp-statuses'] : null,
    async () => {
      const res = await apiClient.get<{ statuses: Record<string, boolean> }>(
        '/v1/browserbase/profiles/totp-statuses',
      );
      if (res.error || !res.data) {
        throw new Error(res.error ?? 'Failed to load 2FA statuses');
      }
      return res.data.statuses ?? {};
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );

  return {
    statuses: data ?? {},
    // Only "loading" until the first response — an empty map is a valid result.
    isLoading: enabled && isLoading,
    mutate,
  };
}

'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

/**
 * Reads whether a connection has an authenticator setup key (TOTP seed) stored —
 * i.e. whether "Automatic 2FA" is on. Read live from the vault, lazily (pass
 * `enabled` so it only fires when the Manage panel is open for a password login).
 */
export function useTotpStatus(profileId: string | undefined, enabled: boolean) {
  const key = enabled && profileId ? (['totp-status', profileId] as const) : null;

  const { data, isLoading, mutate } = useSWR<{ configured: boolean }>(
    key,
    async () => {
      const res = await apiClient.get<{ configured: boolean }>(
        `/v1/browserbase/profiles/${profileId}/totp`,
      );
      if (res.error || !res.data) {
        throw new Error(res.error ?? 'Failed to load 2FA status');
      }
      return res.data;
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false },
  );

  return {
    configured: data?.configured ?? false,
    isLoading: enabled && isLoading,
    mutate,
  };
}

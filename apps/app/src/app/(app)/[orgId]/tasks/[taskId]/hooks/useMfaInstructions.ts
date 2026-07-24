'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

export interface MfaInstructions {
  hostname: string;
  steps: string[];
  tips: string[];
  confident: boolean;
  source: 'generated' | 'fallback';
}

/**
 * Lazily fetches per-vendor authenticator (2FA) setup steps. Pass `enabled`
 * (e.g. only once the help panel is opened) so we don't spend a generation on
 * every render — the API caches per hostname, so repeat opens are instant.
 */
export function useMfaInstructions(host: string | undefined, enabled: boolean) {
  const trimmed = host?.trim();
  const key = enabled && trimmed ? (['mfa-instructions', trimmed] as const) : null;

  const { data, error, isLoading } = useSWR<MfaInstructions>(
    key,
    async () => {
      const res = await apiClient.get<MfaInstructions>(
        `/v1/browserbase/mfa-instructions?host=${encodeURIComponent(trimmed as string)}`,
      );
      if (res.error || !res.data) {
        throw new Error(res.error ?? 'Failed to load setup steps');
      }
      return res.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );

  return { instructions: data, isLoading, error };
}

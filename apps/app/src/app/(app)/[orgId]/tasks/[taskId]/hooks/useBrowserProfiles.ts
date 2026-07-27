'use client';

import { apiClient } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import useSWR from 'swr';
import type { BrowserAuthProfile } from './types';

/**
 * Lists the org's browser auth profiles (one per connected vendor login) so the
 * automations list can group by connection and show each connection's status.
 * SWR keeps the last good list when a refresh fails and exposes loading/error
 * state, so a failed fetch isn't rendered as "no connections yet".
 */
export function useBrowserProfiles() {
  const { orgId } = useParams<{ orgId: string }>();

  const { data, error, isLoading, mutate } = useSWR(
    ['browser-profiles', orgId],
    async () => {
      const res = await apiClient.get<BrowserAuthProfile[]>('/v1/browserbase/profiles');
      if (res.error) throw new Error(res.error);
      return Array.isArray(res.data) ? res.data : [];
    },
    { revalidateOnFocus: false },
  );

  // Unlike SWR's mutate, this never rejects — call sites fire-and-forget or
  // sequence on it, and a failed refresh is surfaced via isError instead of an
  // unhandled rejection.
  const fetchProfiles = useCallback(async () => {
    try {
      await mutate();
    } catch {
      // Surfaced through isError.
    }
  }, [mutate]);

  return {
    profiles: data ?? [],
    isLoading,
    isError: !!error,
    fetchProfiles,
  };
}

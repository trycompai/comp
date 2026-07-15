'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';
import type { BrowserAuthProfile } from './types';

/**
 * Lists the org's browser auth profiles (one per connected vendor login) so the
 * automations list can group by connection and show each connection's status.
 */
export function useBrowserProfiles() {
  const [profiles, setProfiles] = useState<BrowserAuthProfile[]>([]);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await apiClient.get<BrowserAuthProfile[]>('/v1/browserbase/profiles');
      setProfiles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProfiles([]);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, fetchProfiles };
}

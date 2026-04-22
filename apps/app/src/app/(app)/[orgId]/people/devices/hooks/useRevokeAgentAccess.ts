'use client';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { apiClient } from '@/lib/api-client';

export function useRevokeAgentAccess() {
  const { mutate } = useSWRConfig();

  const revokeAgentAccess = useCallback(
    async (deviceId: string) => {
      await apiClient.delete(`/v1/device-agent/sessions/${deviceId}`);
      await mutate(
        (key) => Array.isArray(key) && key[0] === 'people-agent-devices',
      );
    },
    [mutate],
  );

  return { revokeAgentAccess };
}

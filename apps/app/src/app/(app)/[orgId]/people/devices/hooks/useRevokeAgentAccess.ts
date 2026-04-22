'use client';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { apiClient } from '@/lib/api-client';

export function useRevokeAgentAccess() {
  const { mutate } = useSWRConfig();

  const revokeAgentAccess = useCallback(
    async (deviceId: string) => {
      const response = await apiClient.delete(
        `/v1/device-agent/sessions/${deviceId}`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      await mutate(
        (key) => Array.isArray(key) && key[0] === 'people-agent-devices',
      );
    },
    [mutate],
  );

  return { revokeAgentAccess };
}

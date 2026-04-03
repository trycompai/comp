'use client';

import { apiClient } from '@/lib/api-client';
import { usePeopleActions } from '@/hooks/use-people-api';
import { useCallback } from 'react';
import useSWR from 'swr';
import type { Host } from '../types';

interface DevicesApiResponse {
  data: Host[];
}

interface UseDevicesOptions {
  initialData?: Host[];
}

export function useDevices({ initialData }: UseDevicesOptions = {}) {
  const { removeHostFromFleet } = usePeopleActions();

  const { data, error, isLoading, mutate } = useSWR<Host[]>(
    'people-devices',
    async () => {
      const response =
        await apiClient.get<DevicesApiResponse>('/v1/people/devices');
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to fetch devices');
      }
      return Array.isArray(response.data.data) ? response.data.data : [];
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  const removeDevice = useCallback(
    async (memberId: string, hostId: number) => {
      await removeHostFromFleet(memberId, hostId);
      await mutate();
    },
    [removeHostFromFleet, mutate],
  );

  return {
    devices: Array.isArray(data) ? data : [],
    isLoading,
    error,
    removeDevice,
    mutate,
  };
}

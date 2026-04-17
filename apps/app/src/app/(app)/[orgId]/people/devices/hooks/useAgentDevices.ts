'use client';

import useSWR from 'swr';
import type { DeviceWithChecks } from '../types';

interface AgentDevicesResponse {
  data: DeviceWithChecks[];
}

async function fetchAgentDevices(): Promise<DeviceWithChecks[]> {
  const res = await fetch('/api/people/agent-devices', {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch agent devices: ${res.status}`);
  }
  const body = (await res.json()) as AgentDevicesResponse;
  return Array.isArray(body.data) ? body.data : [];
}

export function useAgentDevices() {
  const { data, error, isLoading, mutate } = useSWR<DeviceWithChecks[]>(
    'people-agent-devices',
    fetchAgentDevices,
    { revalidateOnFocus: false },
  );

  return {
    agentDevices: Array.isArray(data) ? data : [],
    isLoading,
    error,
    mutate,
  };
}

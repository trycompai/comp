'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import type { Host } from '../types';

interface FleetHostsResponse {
  data: Host[];
}

async function fetchFleetHosts(): Promise<Host[]> {
  const res = await fetch('/api/people/fleet-hosts', {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch fleet hosts: ${res.status}`);
  }
  const body = (await res.json()) as FleetHostsResponse;
  
  return Array.isArray(body.data) ? body.data : [];
}

export function useFleetHosts() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data, error, isLoading, mutate } = useSWR<Host[]>(
    orgId ? ['people-fleet-hosts', orgId] : null,
    fetchFleetHosts,
    { revalidateOnFocus: false },
  );

  return {
    fleetHosts: Array.isArray(data) ? data : [],
    isLoading,
    error,
    mutate,
  };
}

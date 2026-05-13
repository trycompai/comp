'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR } from '@/hooks/use-api-swr';
import { useCallback } from 'react';

interface RevokedBy {
  id: string;
  name: string;
  email: string;
}

export interface VendorRevocationItem {
  vendorId: string;
  vendorName: string;
  revoked: boolean;
  revokedAt: string | null;
  revokedBy: RevokedBy | null;
  notes: string | null;
}

interface AccessRevocationsResponse {
  vendors: VendorRevocationItem[];
  totalVendors: number;
  revokedCount: number;
}

export function useAccessRevocations(memberId: string) {
  const api = useApi();
  const endpoint = `/v1/offboarding-checklist/member/${memberId}/access-revocations`;

  const { data, error, isLoading, mutate } = useApiSWR<AccessRevocationsResponse>(endpoint);
  const revocations = data?.data ?? null;

  const revokeAccess = useCallback(
    async (vendorId: string, notes?: string) => {
      const response = await api.post(`${endpoint}/${vendorId}`, notes ? { notes } : {});
      if (response.error) throw new Error(response.error);
      await mutate();
    },
    [api, endpoint, mutate],
  );

  const undoRevocation = useCallback(
    async (vendorId: string) => {
      const response = await api.delete(`${endpoint}/${vendorId}`);
      if (response.error) throw new Error(response.error);
      await mutate();
    },
    [api, endpoint, mutate],
  );

  return {
    revocations,
    isLoading,
    error,
    revokeAccess,
    undoRevocation,
  };
}

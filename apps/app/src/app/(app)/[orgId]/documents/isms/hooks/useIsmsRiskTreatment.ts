'use client';

import useSWR from 'swr';
import { api } from '@/lib/api-client';
import type { IsmsRiskTreatmentData } from '../isms-types';

/**
 * The Risk Treatment Plan's rows (6.1.3): the same organisational + supplier
 * risk rows the export renders — resolved server-side from the Risk Register
 * and Vendors with per-row acceptance state — plus the server-computed
 * submit-readiness messages (single source of truth; no client mirror).
 */
export function useIsmsRiskTreatment(documentId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<IsmsRiskTreatmentData>(
    documentId ? (['/v1/isms/documents', documentId, 'risk-treatment'] as const) : null,
    async ([base, id]: readonly [string, string, string]) => {
      const response = await api.get<IsmsRiskTreatmentData>(`${base}/${id}/risk-treatment`);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load the risk treatment data');
      }
      return response.data;
    },
  );

  return {
    riskTreatment: data ?? null,
    error,
    isLoading,
    mutateRiskTreatment: mutate,
  };
}

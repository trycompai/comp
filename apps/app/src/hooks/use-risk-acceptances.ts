'use client';

import { useCallback } from 'react';
import type { Impact, Likelihood } from '@db';
import { useApi } from '@/hooks/use-api';
import { useApiSWR } from '@/hooks/use-api-swr';

/** Which register the acceptance subject lives in. */
export type AcceptanceSubjectKind = 'risk' | 'vendor';

/**
 * One immutable risk-owner acceptance event (ISO 27001 6.1.3(f)), as returned
 * by GET /v1/{risks|vendors}/:id/acceptances — newest first. `stale` is
 * server-computed: the residual rating changed after this acceptance.
 */
export interface RiskAcceptanceEvent {
  id: string;
  acceptedById: string | null;
  acceptedByName: string;
  notes: string | null;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  levelLabel: string;
  stale: boolean;
  createdAt: string;
}

interface AcceptancesResponse {
  data: RiskAcceptanceEvent[];
}

export interface RecordAcceptanceInput {
  /** Member ID of the acceptor; omitted = the owner (server default). */
  acceptedById?: string;
  notes?: string;
}

const endpointFor = (kind: AcceptanceSubjectKind, id: string | null) =>
  id ? `/v1/${kind === 'risk' ? 'risks' : 'vendors'}/${id}/acceptances` : null;

/**
 * Acceptance history + record mutation for a risk or a vendor risk.
 * Acceptances are append-only: there is no update or delete.
 */
export function useAcceptances(kind: AcceptanceSubjectKind, subjectId: string | null) {
  const api = useApi();
  const endpoint = endpointFor(kind, subjectId);
  const swr = useApiSWR<AcceptancesResponse>(endpoint);

  const acceptances = swr.data?.data?.data ?? [];
  const latest = acceptances[0] ?? null;

  const recordAcceptance = useCallback(
    async (input: RecordAcceptanceInput) => {
      if (!endpoint) throw new Error('No subject to record an acceptance for');
      const response = await api.post<RiskAcceptanceEvent>(endpoint, input);
      if (response.error) {
        throw new Error(response.error);
      }
      await swr.mutate();
      return response.data;
    },
    [api, endpoint, swr],
  );

  return {
    acceptances,
    latest,
    isLoading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    recordAcceptance,
  };
}

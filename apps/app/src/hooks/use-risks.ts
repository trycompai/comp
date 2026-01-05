'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import { ApiResponse } from '@/lib/api-client';
import { useCallback } from 'react';
import type {
  RiskCategory,
  Departments,
  RiskStatus,
  Likelihood,
  Impact,
  RiskTreatmentType,
} from '@db';

export interface RiskAssignee {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  department: Departments | null;
  status: RiskStatus;
  likelihood: Likelihood;
  impact: Impact;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  treatmentStrategyDescription: string | null;
  treatmentStrategy: RiskTreatmentType;
  organizationId: string;
  assigneeId: string | null;
  assignee?: RiskAssignee | null;
  createdAt: string;
  updatedAt: string;
}

export interface RisksResponse {
  data: Risk[];
  count: number;
}

export interface RiskResponse extends Risk {
  authType?: string;
}

interface CreateRiskData {
  title: string;
  description?: string;
  category?: RiskCategory;
  department?: Departments;
  status?: RiskStatus;
  likelihood?: Likelihood;
  impact?: Impact;
  residualLikelihood?: Likelihood;
  residualImpact?: Impact;
  treatmentStrategy?: RiskTreatmentType;
  treatmentStrategyDescription?: string;
  assigneeId?: string;
}

interface UpdateRiskData {
  title?: string;
  description?: string;
  category?: RiskCategory;
  department?: Departments | null;
  status?: RiskStatus;
  likelihood?: Likelihood;
  impact?: Impact;
  residualLikelihood?: Likelihood;
  residualImpact?: Impact;
  treatmentStrategy?: RiskTreatmentType;
  treatmentStrategyDescription?: string | null;
  assigneeId?: string | null;
}

export interface UseRisksOptions extends UseApiSWROptions<RisksResponse> {
  /** Initial data from server for hydration - avoids loading state on first render */
  initialData?: Risk[];
}

export interface UseRiskOptions extends UseApiSWROptions<RiskResponse> {
  /** Initial data from server for hydration - avoids loading state on first render */
  initialData?: RiskResponse;
}

/**
 * Hook to fetch all risks for the current organization using SWR
 * Provides automatic caching, revalidation, and real-time updates
 * 
 * @example
 * // With server-side initial data (recommended for pages)
 * const { data, mutate } = useRisks({ initialData: serverRisks });
 * 
 * @example
 * // Without initial data (shows loading state)
 * const { data, isLoading, mutate } = useRisks();
 */
export function useRisks(options: UseRisksOptions = {}) {
  const { initialData, ...restOptions } = options;

  return useApiSWR<RisksResponse>('/v1/risks', {
    ...restOptions,
    // Refresh risks periodically for real-time updates
    refreshInterval: restOptions.refreshInterval ?? 30000,
    // Use initial data as fallback for instant render
    ...(initialData && {
      fallbackData: {
        data: { data: initialData, count: initialData.length },
        status: 200,
      } as ApiResponse<RisksResponse>,
    }),
  });
}

/**
 * Hook to fetch a single risk by ID using SWR
 * Returns null endpoint when riskId is null to disable the request
 * 
 * @example
 * // With server-side initial data (recommended for detail pages)
 * const { data, mutate } = useRisk(riskId, { initialData: serverRisk });
 * 
 * @example
 * // Without initial data (shows loading state)
 * const { data, isLoading, mutate } = useRisk(riskId);
 */
export function useRisk(
  riskId: string | null,
  options: UseRiskOptions = {},
) {
  const { initialData, ...restOptions } = options;

  return useApiSWR<RiskResponse>(riskId ? `/v1/risks/${riskId}` : null, {
    ...restOptions,
    // Use initial data as fallback for instant render
    ...(initialData && {
      fallbackData: {
        data: initialData,
        status: 200,
      } as ApiResponse<RiskResponse>,
    }),
  });
}

/**
 * Hook for risk CRUD operations (mutations)
 * Use alongside useRisks/useRisk and call mutate() after mutations
 */
export function useRiskActions() {
  const api = useApi();

  const createRisk = useCallback(
    async (data: CreateRiskData) => {
      const response = await api.post<Risk>('/v1/risks', data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const updateRisk = useCallback(
    async (riskId: string, data: UpdateRiskData) => {
      const response = await api.patch<Risk>(`/v1/risks/${riskId}`, data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const deleteRisk = useCallback(
    async (riskId: string) => {
      const response = await api.delete(`/v1/risks/${riskId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return { success: true, status: response.status };
    },
    [api],
  );

  return {
    createRisk,
    updateRisk,
    deleteRisk,
  };
}

/**
 * Combined hook for risks with data fetching and mutations
 * Provides a complete solution for risk management with optimistic updates
 */
export function useRisksWithMutations(options: UseApiSWROptions<RisksResponse> = {}) {
  const { data, error, isLoading, mutate } = useRisks(options);
  const { createRisk, updateRisk, deleteRisk } = useRiskActions();

  const create = useCallback(
    async (riskData: CreateRiskData) => {
      const result = await createRisk(riskData);
      // Revalidate the risks list after creation
      await mutate();
      return result;
    },
    [createRisk, mutate],
  );

  const update = useCallback(
    async (riskId: string, riskData: UpdateRiskData) => {
      const result = await updateRisk(riskId, riskData);
      // Revalidate the risks list after update
      await mutate();
      return result;
    },
    [updateRisk, mutate],
  );

  const remove = useCallback(
    async (riskId: string) => {
      const result = await deleteRisk(riskId);
      // Revalidate the risks list after deletion
      await mutate();
      return result;
    },
    [deleteRisk, mutate],
  );

  return {
    risks: data?.data?.data ?? [],
    count: data?.data?.count ?? 0,
    isLoading,
    error,
    mutate,
    createRisk: create,
    updateRisk: update,
    deleteRisk: remove,
  };
}


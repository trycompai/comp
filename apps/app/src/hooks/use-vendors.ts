'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import { ApiResponse } from '@/lib/api-client';
import { useCallback } from 'react';
import type {
  VendorCategory,
  VendorStatus,
  Likelihood,
  Impact,
} from '@db';
import type { JsonValue } from '@prisma/client/runtime/library';

// Default polling interval for real-time updates (5 seconds)
const DEFAULT_POLLING_INTERVAL = 5000;

export interface VendorAssignee {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface Vendor {
  id: string;
  name: string;
  description: string;
  category: VendorCategory;
  status: VendorStatus;
  inherentProbability: Likelihood;
  inherentImpact: Impact;
  residualProbability: Likelihood;
  residualImpact: Impact;
  website: string | null;
  isSubProcessor: boolean;
  organizationId: string;
  assigneeId: string | null;
  assignee?: VendorAssignee | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorsResponse {
  data: Vendor[];
  count: number;
}

/**
 * Vendor response from API includes GlobalVendors risk assessment data
 */
export interface VendorResponse extends Vendor {
  // GlobalVendors risk assessment data merged by API
  riskAssessmentData?: JsonValue | null;
  riskAssessmentVersion?: string | null;
  riskAssessmentUpdatedAt?: string | null;
}

interface CreateVendorData {
  name: string;
  description?: string;
  category?: VendorCategory;
  website?: string;
  assigneeId?: string;
}

interface UpdateVendorData {
  name?: string;
  description?: string;
  category?: VendorCategory;
  status?: VendorStatus;
  website?: string;
  isSubProcessor?: boolean;
  assigneeId?: string | null;
  inherentProbability?: Likelihood;
  inherentImpact?: Impact;
  residualProbability?: Likelihood;
  residualImpact?: Impact;
}

export interface UseVendorsOptions extends UseApiSWROptions<VendorsResponse> {
  /** Initial data from server for hydration - avoids loading state on first render */
  initialData?: Vendor[];
}

export interface UseVendorOptions extends UseApiSWROptions<VendorResponse> {
  /** Initial data from server for hydration - avoids loading state on first render */
  initialData?: VendorResponse;
}

/**
 * Hook to fetch all vendors for the current organization using SWR
 * Provides automatic caching, revalidation, and real-time updates
 * 
 * @example
 * // With server-side initial data (recommended for pages)
 * const { vendors, mutate } = useVendors({ initialData: serverVendors });
 * 
 * @example
 * // Without initial data (shows loading state)
 * const { vendors, isLoading, mutate } = useVendors();
 */
export function useVendors(options: UseVendorsOptions = {}) {
  const { initialData, ...restOptions } = options;

  const swrResponse = useApiSWR<VendorsResponse>('/v1/vendors', {
    ...restOptions,
    // Refresh vendors periodically for real-time updates
    refreshInterval: restOptions.refreshInterval ?? 30000,
    // Use initial data as fallback for instant render
    ...(initialData && {
      fallbackData: {
        data: { data: initialData, count: initialData.length },
        status: 200,
      } as ApiResponse<VendorsResponse>,
    }),
  });

  return swrResponse;
}

/**
 * Hook to fetch a single vendor by ID using SWR
 * Provides real-time updates via polling
 * 
 * @example
 * // With server-side initial data (recommended for detail pages)
 * const { data, mutate } = useVendor(vendorId, { initialData: serverVendor });
 * 
 * @example
 * // Without initial data (shows loading state)
 * const { data, isLoading, mutate } = useVendor(vendorId);
 */
export function useVendor(
  vendorId: string | null,
  options: UseVendorOptions = {},
) {
  const { initialData, ...restOptions } = options;

  const swrResult = useApiSWR<VendorResponse>(
    vendorId ? `/v1/vendors/${vendorId}` : null,
    {
      ...restOptions,
      // Enable polling for real-time updates (when trigger.dev tasks complete)
      refreshInterval: restOptions.refreshInterval ?? DEFAULT_POLLING_INTERVAL,
      // Continue polling even when window is not focused
      refreshWhenHidden: false,
      // Use initial data as fallback for instant render
      ...(initialData && {
        fallbackData: {
          data: initialData,
          status: 200,
        } as ApiResponse<VendorResponse>,
      }),
    },
  );

  // Extract vendor data from response
  const vendor = swrResult.data?.data ?? null;

  return {
    ...swrResult,
    vendor,
  };
}

/**
 * Hook for vendor CRUD operations (mutations)
 * Use alongside useVendors/useVendor and call mutate() after mutations
 */
interface TriggerAssessmentResponse {
  success: boolean;
  runId: string;
  publicAccessToken: string;
}

export function useVendorActions() {
  const api = useApi();

  const createVendor = useCallback(
    async (data: CreateVendorData) => {
      const response = await api.post<Vendor>('/v1/vendors', data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const updateVendor = useCallback(
    async (vendorId: string, data: UpdateVendorData) => {
      const response = await api.patch<Vendor>(`/v1/vendors/${vendorId}`, data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const deleteVendor = useCallback(
    async (vendorId: string) => {
      const response = await api.delete(`/v1/vendors/${vendorId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return { success: true, status: response.status };
    },
    [api],
  );

  const triggerAssessment = useCallback(
    async (vendorId: string) => {
      const response = await api.post<TriggerAssessmentResponse>(
        `/v1/vendors/${vendorId}/trigger-assessment`,
        {},
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const regenerateMitigation = useCallback(
    async (vendorId: string) => {
      const response = await fetch(`/api/vendors/${vendorId}/regenerate-mitigation`, {
        method: 'POST',
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to trigger mitigation regeneration');
      }
    },
    [],
  );

  return {
    createVendor,
    updateVendor,
    deleteVendor,
    triggerAssessment,
    regenerateMitigation,
  };
}

/**
 * Combined hook for vendors with data fetching and mutations
 * Provides a complete solution for vendor management with optimistic updates
 */
export function useVendorsWithMutations(options: UseApiSWROptions<VendorsResponse> = {}) {
  const { data, error, isLoading, mutate } = useVendors(options);
  const { createVendor, updateVendor, deleteVendor } = useVendorActions();

  const create = useCallback(
    async (vendorData: CreateVendorData) => {
      const result = await createVendor(vendorData);
      // Revalidate the vendors list after creation
      await mutate();
      return result;
    },
    [createVendor, mutate],
  );

  const update = useCallback(
    async (vendorId: string, vendorData: UpdateVendorData) => {
      const result = await updateVendor(vendorId, vendorData);
      // Revalidate the vendors list after update
      await mutate();
      return result;
    },
    [updateVendor, mutate],
  );

  const remove = useCallback(
    async (vendorId: string) => {
      const result = await deleteVendor(vendorId);
      // Revalidate the vendors list after deletion
      await mutate();
      return result;
    },
    [deleteVendor, mutate],
  );

  return {
    vendors: data?.data?.data ?? [],
    count: data?.data?.count ?? 0,
    isLoading,
    error,
    mutate,
    createVendor: create,
    updateVendor: update,
    deleteVendor: remove,
  };
}


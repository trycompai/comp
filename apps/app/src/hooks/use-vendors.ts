'use client';

import { useApi } from '@/hooks/use-api';
import { UseApiSWROptions } from '@/hooks/use-api-swr';
import { ApiResponse, apiClient } from '@/lib/api-client';
import { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import type { VendorCategory, VendorStatus, Likelihood, Impact } from '@db';
import type { JsonValue } from '@prisma/client/runtime/library';
import type { VendorsQuery } from '@/lib/vendors-query';
import { buildVendorsQueryString } from '@/lib/vendors-query';


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
  organizationId: string;
  assigneeId: string | null;
  assignee?: VendorAssignee | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorsResponse {
  data: Vendor[];
  count: number;
  page?: number;
  perPage?: number;
  pageCount?: number;
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

export interface UpdateVendorData {
  name?: string;
  description?: string;
  category?: VendorCategory;
  status?: VendorStatus;
  website?: string;
  assigneeId?: string | null;
  inherentProbability?: Likelihood;
  inherentImpact?: Impact;
  residualProbability?: Likelihood;
  residualImpact?: Impact;
}

export interface UseVendorsOptions extends UseApiSWROptions<VendorsResponse> {
  /** Initial data from server for hydration - avoids loading state on first render */
  initialData?: Vendor[];
  query?: VendorsQuery;
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
  const api = useApi();
  const params = useParams();
  const orgIdFromParams = params?.orgId as string | undefined;
  const { initialData, query, ...restOptions } = options;

  const endpoint = `/v1/vendors${buildVendorsQueryString(query ?? {})}`;
  const { organizationId: explicitOrgId, enabled = true, ...swrOptions } = restOptions;
  const organizationId = orgIdFromParams || explicitOrgId;

  const swrKey = useMemo(() => {
    if (!endpoint || !organizationId || !enabled) return null;
    return [endpoint, organizationId] as const;
  }, [endpoint, organizationId, enabled]);

  const fetcher = async ([url, orgId]: readonly [string, string]) => {
    return apiClient.get<VendorsResponse>(url, orgId);
  };

  const swrResponse = useSWR<ApiResponse<VendorsResponse>>(swrKey, fetcher, {
    // Refresh vendors periodically for real-time updates
    refreshInterval: swrOptions.refreshInterval ?? 30000,
    // Use initial data as fallback for instant render
    ...(initialData && {
      fallbackData: {
        data: { data: initialData, count: initialData.length },
        status: 200,
      } as ApiResponse<VendorsResponse>,
    }),
    ...swrOptions,
  });

  const createVendor = useCallback(
    async (data: CreateVendorData) => {
      const response = await api.post<Vendor>('/v1/vendors', data);
      if (response.error) {
        throw new Error(response.error);
      }
      await swrResponse.mutate();
      return response.data!;
    },
    [api, swrResponse],
  );

  const updateVendor = useCallback(
    async (vendorId: string, data: UpdateVendorData) => {
      const response = await api.patch<Vendor>(`/v1/vendors/${vendorId}`, data);
      if (response.error) {
        throw new Error(response.error);
      }
      await swrResponse.mutate();
      return response.data!;
    },
    [api, swrResponse],
  );

  const deleteVendor = useCallback(
    async (vendorId: string) => {
      const response = await api.delete(`/v1/vendors/${vendorId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      await swrResponse.mutate();
      return { success: true, status: response.status };
    },
    [api, swrResponse],
  );

  return {
    ...swrResponse,
    vendors: swrResponse.data?.data?.data ?? [],
    count: swrResponse.data?.data?.count ?? 0,
    createVendor,
    updateVendor,
    deleteVendor,
  };
}


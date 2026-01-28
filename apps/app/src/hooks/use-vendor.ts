'use client';

import { useApi } from '@/hooks/use-api';
import { apiClient, type ApiResponse } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { UpdateVendorData, UseVendorOptions, Vendor, VendorResponse } from './use-vendors';

// Default polling interval for real-time updates (5 seconds)
const DEFAULT_POLLING_INTERVAL = 5000;

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
export function useVendor(vendorId: string | null, options: UseVendorOptions = {}) {
  const { initialData, ...restOptions } = options;
  const api = useApi();
  const [isUpdating, setIsUpdating] = useState(false);
  const params = useParams();
  const orgIdFromParams = params?.orgId as string | undefined;
  const { organizationId: explicitOrgId, enabled = true, ...swrOptions } = restOptions;
  const organizationId = orgIdFromParams || explicitOrgId;
  const endpoint = vendorId ? `/v1/vendors/${vendorId}` : null;

  const swrKey = useMemo(() => {
    if (!endpoint || !organizationId || !enabled) return null;
    return [endpoint, organizationId] as const;
  }, [endpoint, organizationId, enabled]);

  const fetcher = async ([url, orgId]: readonly [string, string]) => {
    return apiClient.get<VendorResponse>(url, orgId);
  };

  const swrResult = useSWR<ApiResponse<VendorResponse>>(swrKey, fetcher, {
    // Enable polling for real-time updates (when trigger.dev tasks complete)
    refreshInterval: swrOptions.refreshInterval ?? DEFAULT_POLLING_INTERVAL,
    // Continue polling even when window is not focused
    refreshWhenHidden: false,
    // Use initial data as fallback for instant render
    ...(initialData && {
      fallbackData: {
        data: initialData,
        status: 200,
      } as ApiResponse<VendorResponse>,
    }),
    ...swrOptions,
  });

  // Extract vendor data from response
  const vendor = swrResult.data?.data ?? null;

  const updateVendor = useCallback(
    async (nextVendorId: string, data: UpdateVendorData) => {
      setIsUpdating(true);
      try {
        const response = await api.patch<Vendor>(`/v1/vendors/${nextVendorId}`, data);
        if (response.error) {
          throw new Error(response.error);
        }
        await swrResult.mutate();
        return response.data!;
      } finally {
        setIsUpdating(false);
      }
    },
    [api, swrResult],
  );

  return {
    ...swrResult,
    vendor,
    updateVendor,
    isUpdating,
  };
}

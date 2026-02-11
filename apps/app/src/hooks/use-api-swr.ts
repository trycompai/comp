'use client';

import { apiClient, ApiResponse } from '@/lib/api-client';
import { useActiveOrganization } from '@/utils/auth-client';
import { useMemo } from 'react';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';

export interface UseApiSWROptions<T> extends SWRConfiguration<ApiResponse<T>> {
  enabled?: boolean;
}

/**
 * SWR-based hook for GET requests.
 * Organization context is carried by the session token.
 * The active org ID is still used in the SWR cache key so that switching orgs invalidates caches.
 */
export function useApiSWR<T = unknown>(
  endpoint: string | null, // null to disable the request
  options: UseApiSWROptions<T> = {},
): SWRResponse<ApiResponse<T>, Error> {
  const activeOrg = useActiveOrganization();
  const { enabled = true, ...swrOptions } = options;

  const organizationId = activeOrg.data?.id;

  // Create stable key for SWR — include org ID for cache scoping
  const swrKey = useMemo(() => {
    if (!endpoint || !organizationId || !enabled) {
      return null;
    }
    return [endpoint, organizationId] as const;
  }, [endpoint, organizationId, enabled]);

  // SWR fetcher function
  const fetcher = async ([url]: readonly [string, string]): Promise<ApiResponse<T>> => {
    return apiClient.get<T>(url);
  };

  const swrResponse = useSWR(swrKey, fetcher, {
    // Default SWR options optimized for our API
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    errorRetryInterval: 1000,
    errorRetryCount: 3,
    ...swrOptions,
  });

  return swrResponse;
}


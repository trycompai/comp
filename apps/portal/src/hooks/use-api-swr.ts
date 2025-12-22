'use client';

import { apiClient, type ApiResponse } from '@/lib/api-client';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';

interface UseApiSWROptions<T> extends SWRConfiguration<ApiResponse<T>> {
  organizationId: string;
  enabled?: boolean;
}

export function useApiSWR<T = unknown>(
  endpoint: string | null,
  { organizationId, enabled = true, ...swrOptions }: UseApiSWROptions<T>,
): SWRResponse<ApiResponse<T>, Error> {
  const key = endpoint && enabled ? ([endpoint, organizationId] as const) : null;

  return useSWR(
    key,
    async ([url, orgId]) => {
      return apiClient.get<T>(url, orgId);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      errorRetryInterval: 1000,
      errorRetryCount: 3,
      ...swrOptions,
    },
  );
}

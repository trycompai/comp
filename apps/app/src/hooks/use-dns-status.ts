'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

interface DnsCheckResponse {
  success: boolean;
  isCnameVerified?: boolean;
  isTxtVerified?: boolean;
  isVercelTxtVerified?: boolean;
  error?: string;
}

/**
 * Checks DNS record verification status for a domain.
 * Calls the check-dns endpoint once on mount (no polling).
 * Disabled when domain is empty or already verified.
 */
export function useDnsStatus({
  domain,
  enabled,
}: {
  domain: string;
  enabled: boolean;
}) {
  const { data, isLoading, mutate } = useSWR(
    enabled && domain ? ['check-dns', domain] : null,
    async () => {
      const response = await apiClient.post<DnsCheckResponse>(
        '/v1/trust-portal/settings/check-dns',
        { domain },
      );
      return response.data;
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  return {
    isCnameVerified: !!data?.isCnameVerified,
    isTxtVerified: !!data?.isTxtVerified,
    isVercelTxtVerified: !!data?.isVercelTxtVerified,
    isLoading,
    mutate,
  };
}

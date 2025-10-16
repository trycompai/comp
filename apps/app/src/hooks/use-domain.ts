'use client';

import { useApiSWR } from '@/hooks/use-api-swr';

export interface DomainVerification {
  type: string;
  domain: string;
  value: string;
  reason?: string;
}

export interface DomainStatusResponse {
  domain: string;
  verified: boolean;
  verification: DomainVerification[];
}

export function useDomain(domain: string) {
  const endpoint = `/v1/trust-portal/domain/status?domain=${domain}`;

  return useApiSWR<DomainStatusResponse>(endpoint);
}

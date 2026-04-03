'use client';

import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { useApiSWR, UseApiSWROptions } from './use-api-swr';

/**
 * Hook that provides API client methods.
 * Organization context is carried by the session token — no explicit org ID needed.
 */
export function useApi() {
  const params = useParams();
  const orgIdFromParams = params?.orgId as string;

  return {
    // Organization context (from URL params, for display/routing purposes)
    organizationId: orgIdFromParams,

    // Standard API methods (for mutations)
    get: useCallback(
      <T = unknown>(endpoint: string) => api.get<T>(endpoint),
      [],
    ),

    post: useCallback(
      <T = unknown>(endpoint: string, body?: unknown) => api.post<T>(endpoint, body),
      [],
    ),

    put: useCallback(
      <T = unknown>(endpoint: string, body?: unknown) => api.put<T>(endpoint, body),
      [],
    ),

    patch: useCallback(
      <T = unknown>(endpoint: string, body?: unknown) => api.patch<T>(endpoint, body),
      [],
    ),

    delete: useCallback(
      <T = unknown>(endpoint: string) => api.delete<T>(endpoint),
      [],
    ),

    // SWR-based GET requests (recommended for data fetching)
    useSWR: <T = unknown>(endpoint: string | null, options?: UseApiSWROptions<T>) => {
      return useApiSWR<T>(endpoint, options);
    },
  };
}


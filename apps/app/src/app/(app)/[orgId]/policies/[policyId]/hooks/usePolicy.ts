'use client';

import { apiClient } from '@/lib/api-client';
import type { Member, Policy, User } from '@db';
import { useEffect, useRef } from 'react';
import useSWR from 'swr';

type PolicyWithApprover = Policy & { approver: (Member & { user: User }) | null };

// API response includes policy fields directly, plus auth info
type PolicyApiResponse = PolicyWithApprover & {
  authType?: string;
  authenticatedUser?: { id: string; email: string };
};

interface UsePolicyOptions {
  policyId: string;
  organizationId: string;
  initialData?: PolicyWithApprover | null;
}

export function usePolicy({ policyId, organizationId, initialData }: UsePolicyOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/v1/policies', policyId, organizationId],
    async () => {
      const response = await apiClient.get<PolicyApiResponse>(
        `/v1/policies/${policyId}`,
        organizationId,
      );
      if (response.error) throw new Error(response.error);
      if (!response.data) return null;
      
      // Extract policy fields, excluding auth info
      const { authType: _authType, authenticatedUser: _authenticatedUser, ...policy } = response.data;
      return policy as PolicyWithApprover;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: false,
      revalidateOnFocus: false,
    },
  );

  // Track if this is the first render to avoid unnecessary updates
  const isFirstRender = useRef(true);
  const prevInitialDataRef = useRef(initialData);

  // Sync initialData to SWR cache when it changes (e.g., after router.refresh())
  // This ensures the cache is updated when server component re-fetches data
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Only update if initialData actually changed (compare by currentVersionId for efficiency)
    const prevVersionId = prevInitialDataRef.current?.currentVersionId;
    const newVersionId = initialData?.currentVersionId;
    
    if (initialData && prevVersionId !== newVersionId) {
      mutate(initialData, false); // Update cache without revalidating
    }
    
    prevInitialDataRef.current = initialData;
  }, [initialData, mutate]);

  return {
    policy: data ?? null,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

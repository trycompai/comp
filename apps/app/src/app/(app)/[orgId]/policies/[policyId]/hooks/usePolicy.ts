'use client';

import { apiClient } from '@/lib/api-client';
import type { Member, Policy, User } from '@db';
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

  return {
    policy: data ?? null,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

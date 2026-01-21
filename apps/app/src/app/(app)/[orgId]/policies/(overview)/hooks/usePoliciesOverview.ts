'use client';

import { apiClient } from '@/lib/api-client';
import { useMemo } from 'react';
import useSWR from 'swr';
import {
  computePoliciesOverview,
  type AssigneeData,
  type PoliciesOverview,
} from '../lib/compute-overview';

// Re-export types for convenience
export type { AssigneeData, PoliciesOverview };

interface PolicyFromApi {
  id: string;
  status: string;
  isArchived: boolean;
  assigneeId: string | null;
  assignee?: {
    id: string;
    user: {
      name: string | null;
    };
  } | null;
}

interface UsePoliciesOverviewOptions {
  organizationId: string;
  initialData?: PoliciesOverview | null;
}

export function usePoliciesOverview({ organizationId, initialData }: UsePoliciesOverviewOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/v1/policies', organizationId],
    async ([endpoint, orgId]) => {
      const response = await apiClient.get<{ data: PolicyFromApi[] }>(endpoint, orgId);
      if (response.error) throw new Error(response.error);
      return response.data?.data ?? [];
    },
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
    },
  );

  // Compute overview from policies (client-side aggregation)
  const overview = useMemo(() => {
    if (data) {
      return computePoliciesOverview(data);
    }
    return initialData ?? null;
  }, [data, initialData]);

  return {
    overview,
    policies: data,
    isLoading: !data && !error && !initialData,
    error,
    mutate,
  };
}

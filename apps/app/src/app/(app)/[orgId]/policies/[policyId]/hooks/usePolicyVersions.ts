'use client';

import { apiClient } from '@/lib/api-client';
import type { Member, PolicyVersion, User } from '@db';
import { useEffect, useRef } from 'react';
import useSWR from 'swr';

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

// API response includes versions in data object, plus auth info
type VersionsApiResponse = {
  data: {
    versions: PolicyVersionWithPublisher[];
    currentVersionId: string | null;
    pendingVersionId: string | null;
  };
  authType?: string;
  authenticatedUser?: { id: string; email: string };
};

interface UsePolicyVersionsOptions {
  policyId: string;
  organizationId: string;
  initialData?: PolicyVersionWithPublisher[];
}

export function usePolicyVersions({
  policyId,
  organizationId,
  initialData,
}: UsePolicyVersionsOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/v1/policies/versions', policyId, organizationId],
    async () => {
      const response = await apiClient.get<VersionsApiResponse>(
        `/v1/policies/${policyId}/versions`,
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data?.versions) return [];

      return response.data.data.versions;
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

    // Only update if initialData actually changed (compare by length and first item id for efficiency)
    const prevLength = prevInitialDataRef.current?.length ?? 0;
    const newLength = initialData?.length ?? 0;
    const prevFirstId = prevInitialDataRef.current?.[0]?.id;
    const newFirstId = initialData?.[0]?.id;

    if (
      initialData &&
      (prevLength !== newLength || prevFirstId !== newFirstId)
    ) {
      mutate(initialData, false); // Update cache without revalidating
    }

    prevInitialDataRef.current = initialData;
  }, [initialData, mutate]);

  // Ensure we always return an array, even if SWR returns unexpected data
  const safeVersions = Array.isArray(data) ? data : [];

  return {
    versions: safeVersions,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

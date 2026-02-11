'use client';

import { apiClient } from '@/lib/api-client';
import type { Member, PolicyVersion, User } from '@db';
import { useCallback, useEffect, useRef } from 'react';
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

type CreateVersionResponse = {
  data?: { versionId?: string; version?: number };
};

export const policyVersionsKey = (policyId: string, organizationId: string) =>
  ['/v1/policies/versions', policyId, organizationId] as const;

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
    policyVersionsKey(policyId, organizationId),
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

  // Sync initialData to SWR cache when it changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const prevLength = prevInitialDataRef.current?.length ?? 0;
    const newLength = initialData?.length ?? 0;
    const prevFirstId = prevInitialDataRef.current?.[0]?.id;
    const newFirstId = initialData?.[0]?.id;

    if (
      initialData &&
      (prevLength !== newLength || prevFirstId !== newFirstId)
    ) {
      mutate(initialData, false);
    }

    prevInitialDataRef.current = initialData;
  }, [initialData, mutate]);

  const createVersion = useCallback(
    async (changelog?: string) => {
      const response = await apiClient.post<CreateVersionResponse>(
        `/v1/policies/${policyId}/versions`,
        { changelog: changelog || undefined },
      );
      if (response.error) throw new Error(response.error);
      await mutate();
      return response;
    },
    [policyId, mutate],
  );

  const deleteVersion = useCallback(
    async (versionId: string) => {
      const response = await apiClient.delete(
        `/v1/policies/${policyId}/versions/${versionId}`,
      );
      if (response.error) throw new Error(response.error);
      await mutate();
      return response;
    },
    [policyId, mutate],
  );

  const submitForApproval = useCallback(
    async (versionId: string, approverId: string) => {
      const response = await apiClient.post(
        `/v1/policies/${policyId}/versions/${versionId}/submit-for-approval`,
        { approverId },
      );
      if (response.error) throw new Error(response.error);
      await mutate();
      return response;
    },
    [policyId, mutate],
  );

  const updateVersionContent = useCallback(
    async (versionId: string, content: PolicyVersion['content']) => {
      const response = await apiClient.patch(
        `/v1/policies/${policyId}/versions/${versionId}`,
        { content },
      );
      if (response.error) throw new Error(response.error);
      // Optimistically update the version content in cache
      mutate(
        (currentVersions) => {
          if (!currentVersions || !Array.isArray(currentVersions)) return [];
          return currentVersions.map((v) =>
            v.id === versionId ? { ...v, content } : v,
          );
        },
        false,
      );
      return response;
    },
    [policyId, mutate],
  );

  // Ensure we always return an array, even if SWR returns unexpected data
  const safeVersions = Array.isArray(data) ? data : [];

  return {
    versions: safeVersions,
    isLoading: isLoading && !data,
    error,
    mutate,
    createVersion,
    deleteVersion,
    submitForApproval,
    updateVersionContent,
  };
}

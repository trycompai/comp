'use client';

import { apiClient } from '@/lib/api-client';
import type { Member, Policy, User } from '@db';
import { useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';

type PolicyWithApprover = Policy & { approver: (Member & { user: User }) | null };

// API response includes policy fields directly, plus auth info
type PolicyApiResponse = PolicyWithApprover & {
  authType?: string;
  authenticatedUser?: { id: string; email: string };
};

export const policyKey = (policyId: string, organizationId: string) =>
  ['/v1/policies', policyId, organizationId] as const;

interface UsePolicyOptions {
  policyId: string;
  organizationId: string;
  initialData?: PolicyWithApprover | null;
}

export function usePolicy({ policyId, organizationId, initialData }: UsePolicyOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    policyKey(policyId, organizationId),
    async () => {
      const response = await apiClient.get<PolicyApiResponse>(
        `/v1/policies/${policyId}`,
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

  // Sync initialData to SWR cache when it changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const prevVersionId = prevInitialDataRef.current?.currentVersionId;
    const newVersionId = initialData?.currentVersionId;

    if (initialData && prevVersionId !== newVersionId) {
      mutate(initialData, false);
    }

    prevInitialDataRef.current = initialData;
  }, [initialData, mutate]);

  const updatePolicy = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await apiClient.patch(`/v1/policies/${policyId}`, body);
      if (response.error) throw new Error(response.error);
      await mutate();
      return response;
    },
    [policyId, mutate],
  );

  const deletePolicy = useCallback(async () => {
    const response = await apiClient.delete(`/v1/policies/${policyId}`);
    if (response.error) throw new Error(response.error);
    return response;
  }, [policyId]);

  const archivePolicy = useCallback(
    async (isArchived: boolean) => {
      const response = await apiClient.patch(`/v1/policies/${policyId}`, { isArchived });
      if (response.error) throw new Error(response.error);
      await mutate();
      return response;
    },
    [policyId, mutate],
  );

  const regeneratePolicy = useCallback(async () => {
    const response = await apiClient.post<{
      data: { runId: string; publicAccessToken: string };
    }>(`/v1/policies/${policyId}/regenerate`);
    if (response.error) throw new Error(response.error);
    return response;
  }, [policyId]);

  const acceptChanges = useCallback(
    async (body: { approverId: string; comment?: string }) => {
      const response = await apiClient.post(
        `/v1/policies/${policyId}/accept-changes`,
        body,
      );
      if (response.error) throw new Error(response.error);
      await mutate();
      return response;
    },
    [policyId, mutate],
  );

  const denyChanges = useCallback(
    async (body: { approverId: string; comment?: string }) => {
      const response = await apiClient.post(
        `/v1/policies/${policyId}/deny-changes`,
        body,
      );
      if (response.error) throw new Error(response.error);
      await mutate();
      return response;
    },
    [policyId, mutate],
  );

  const addControlMappings = useCallback(
    async (controlIds: string[]) => {
      const response = await apiClient.post(`/v1/policies/${policyId}/controls`, {
        controlIds,
      });
      if (response.error) throw new Error(response.error);
      return response;
    },
    [policyId],
  );

  const removeControlMapping = useCallback(
    async (controlId: string) => {
      const response = await apiClient.delete(
        `/v1/policies/${policyId}/controls/${controlId}`,
      );
      if (response.error) throw new Error(response.error);
      return response;
    },
    [policyId],
  );

  const getPdfUrl = useCallback(
    async (versionId?: string) => {
      const params = new URLSearchParams();
      if (versionId) params.set('versionId', versionId);
      const qs = params.toString();
      const response = await apiClient.get<{ url: string | null }>(
        `/v1/policies/${policyId}/pdf/signed-url${qs ? `?${qs}` : ''}`,
      );
      if (response.error) throw new Error(response.error);
      return response.data?.url ?? null;
    },
    [policyId],
  );

  return {
    policy: data ?? null,
    isLoading: isLoading && !data,
    error,
    mutate,
    updatePolicy,
    deletePolicy,
    archivePolicy,
    regeneratePolicy,
    acceptChanges,
    denyChanges,
    addControlMappings,
    removeControlMapping,
    getPdfUrl,
  };
}

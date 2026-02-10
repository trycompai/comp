'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';

interface CreatePolicyData {
  name: string;
  description?: string;
  content?: unknown[];
}

interface UpdatePolicyData {
  name?: string;
  description?: string;
  status?: string;
  assigneeId?: string | null;
  department?: string;
  frequency?: string;
  reviewDate?: Date;
  isArchived?: boolean;
}

/**
 * Hook for policy CRUD mutations.
 * Use this in shared components that need to create/update policies
 * but don't have access to the full usePolicy hook (which requires policyId).
 */
export function usePolicyMutations() {
  const createPolicy = useCallback(
    async (data: CreatePolicyData) => {
      const response = await apiClient.post('/v1/policies', data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    [],
  );

  const updatePolicy = useCallback(
    async (policyId: string, data: UpdatePolicyData) => {
      const response = await apiClient.patch(
        `/v1/policies/${policyId}`,
        data,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    [],
  );

  return { createPolicy, updatePolicy };
}

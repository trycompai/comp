'use client';

import type { JSONContent } from '@tiptap/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdatePolicyContentInput {
  policyId: string;
  organizationId: string;
  content: JSONContent[];
}

export function useUpdatePolicyContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, organizationId, content }: UpdatePolicyContentInput) => {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId, content }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update policy' }));
        throw new Error(error.message || 'Failed to update policy');
      }

      return response.json();
    },
    onSuccess: (_, { policyId }) => {
      queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
    },
  });
}

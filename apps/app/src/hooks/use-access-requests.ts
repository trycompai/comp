'use client';

import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type AccessRequest = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  jobTitle?: string | null;
  purpose?: string | null;
  requestedDurationDays?: number | null;
  requestedScopes: string[];
  status: 'under_review' | 'approved' | 'denied' | 'canceled';
  createdAt: string;
  reviewedAt?: string | null;
  decisionReason?: string | null;
  reviewer?: {
    id: string;
    user: { name: string; email: string };
  } | null;
  grant?: {
    id: string;
    status: string;
    expiresAt: string;
  } | null;
};

export function useAccessRequests(orgId: string) {
  const api = useApi();

  return useQuery({
    queryKey: ['trust-access-requests', orgId],
    queryFn: async () => {
      const response = await api.get<AccessRequest[]>(
        '/v1/trust-access/admin/requests',
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data!;
    },
  });
}

export function useApproveAccessRequest(orgId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post(
        `/v1/trust-access/admin/requests/${requestId}/approve`,
        {},
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['trust-access-requests', orgId],
      });
    },
  });
}

export function useDenyAccessRequest(orgId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const response = await api.post(
        `/v1/trust-access/admin/requests/${requestId}/deny`,
        { reason },
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['trust-access-requests', orgId],
      });
    },
  });
}

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

export type AccessGrant = {
  id: string;
  subjectEmail: string;
  status: 'active' | 'expired' | 'revoked';
  expiresAt: string;
  accessRequestId: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
  createdAt: string;
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
    mutationFn: async ({ requestId, durationDays }: { requestId: string; durationDays: number }) => {
      const response = await api.post(
        `/v1/trust-access/admin/requests/${requestId}/approve`,
        { durationDays },
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

export function useAccessRequest(orgId: string, requestId: string) {
  const api = useApi();

  return useQuery({
    queryKey: ['trust-access-request', orgId, requestId],
    queryFn: async () => {
      const response = await api.get<AccessRequest>(
        `/v1/trust-access/admin/requests/${requestId}`,
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data!;
    },
  });
}

export function useAccessGrants(orgId: string) {
  const api = useApi();

  return useQuery({
    queryKey: ['trust-access-grants', orgId],
    queryFn: async () => {
      const response = await api.get<AccessGrant[]>(
        '/v1/trust-access/admin/grants',
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data!;
    },
  });
}

export function useRevokeAccessGrant(orgId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ grantId, reason }: { grantId: string; reason: string }) => {
      const response = await api.post(
        `/v1/trust-access/admin/grants/${grantId}/revoke`,
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
        queryKey: ['trust-access-grants', orgId],
      });
    },
  });
}

export function useResendNda(orgId: string) {
  const api = useApi();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post(
        `/v1/trust-access/admin/requests/${requestId}/resend-nda`,
        {},
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
  });
}

export function usePreviewNda(orgId: string) {
  const api = useApi();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post<{
        message: string;
        previewId: string;
        s3Key: string;
        pdfDownloadUrl: string;
      }>(
        `/v1/trust-access/admin/requests/${requestId}/preview-nda`,
        {},
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data!;
    },
  });
}

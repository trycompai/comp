'use client';

import { useApi } from '@/hooks/use-api';
import { useCallback } from 'react';

export interface TrustCustomLink {
  id: string;
  title: string;
  description: string | null;
  url: string;
  order: number;
  isActive: boolean;
}

interface CreateLinkData {
  title: string;
  description: string | null;
  url: string;
}

interface UpdateLinkData {
  title?: string;
  description?: string | null;
  url?: string;
}

export function useTrustPortalCustomLinks(orgId: string) {
  const api = useApi();

  const createLink = useCallback(
    async (data: CreateLinkData) => {
      const response = await api.post<TrustCustomLink>(
        '/v1/trust-portal/custom-links',
        { organizationId: orgId, ...data },
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api, orgId],
  );

  const updateLink = useCallback(
    async (linkId: string, data: UpdateLinkData) => {
      const response = await api.post<TrustCustomLink>(
        `/v1/trust-portal/custom-links/${linkId}`,
        data,
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const deleteLink = useCallback(
    async (linkId: string) => {
      const response = await api.post(
        `/v1/trust-portal/custom-links/${linkId}/delete`,
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const reorderLinks = useCallback(
    async (linkIds: string[]) => {
      const response = await api.post('/v1/trust-portal/custom-links/reorder', {
        organizationId: orgId,
        linkIds,
      });
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api, orgId],
  );

  return {
    createLink,
    updateLink,
    deleteLink,
    reorderLinks,
  };
}

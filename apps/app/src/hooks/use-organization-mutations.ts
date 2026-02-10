'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';

interface UpdateOrganizationData {
  name?: string;
  website?: string;
  evidenceApprovalEnabled?: boolean;
}

interface UploadLogoData {
  fileName: string;
  fileType: string;
  fileData: string;
}

interface LogoUploadResponse {
  logoUrl: string;
}

/**
 * Hook for organization settings mutations.
 * Provides create/update/delete helpers for organization-level operations.
 */
export function useOrganizationMutations() {
  const updateOrganization = useCallback(
    async (data: UpdateOrganizationData) => {
      const response = await apiClient.patch('/v1/organization', data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    [],
  );

  const uploadLogo = useCallback(async (data: UploadLogoData) => {
    const response = await apiClient.post<LogoUploadResponse>(
      '/v1/organization/logo',
      data,
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  }, []);

  const removeLogo = useCallback(async () => {
    const response = await apiClient.delete('/v1/organization/logo');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  }, []);

  const deleteOrganization = useCallback(async () => {
    const response = await apiClient.delete('/v1/organization');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  }, []);

  return {
    updateOrganization,
    uploadLogo,
    removeLogo,
    deleteOrganization,
  };
}

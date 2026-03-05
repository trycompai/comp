'use client';

import { useApi } from '@/hooks/use-api';
import { useCallback } from 'react';

interface ToggleSettingsData {
  enabled?: boolean;
  contactEmail?: string;
  primaryColor?: string;
}

interface FrameworkSettingsData {
  [key: string]: boolean | string | undefined;
}

interface ComplianceResourceResponse {
  framework: string;
  fileName: string;
  fileSize: number;
  updatedAt: string;
}

interface ComplianceResourceUrlResponse {
  signedUrl: string;
  fileName: string;
  fileSize: number;
}

interface OverviewData {
  organizationId: string;
  overviewTitle: string | null;
  overviewContent: string | null;
  showOverview: boolean;
}

interface FaviconUploadResponse {
  success: boolean;
  faviconUrl: string;
}

interface VendorTrustSettingsData {
  showOnTrustPortal: boolean;
}

export function useTrustPortalSettings() {
  const api = useApi();

  const updateToggleSettings = useCallback(
    async (data: ToggleSettingsData) => {
      const response = await api.put('/v1/trust-portal/settings/toggle', data);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const updateFrameworkSettings = useCallback(
    async (data: FrameworkSettingsData) => {
      const response = await api.put(
        '/v1/trust-portal/settings/frameworks',
        data,
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const uploadComplianceResource = useCallback(
    async (
      organizationId: string,
      framework: string,
      fileName: string,
      fileType: string,
      fileData: string,
    ) => {
      const response = await api.post<ComplianceResourceResponse>(
        '/v1/trust-portal/compliance-resources/upload',
        { organizationId, framework, fileName, fileType, fileData },
      );
      if (response.error) throw new Error(response.error);
      if (!response.data) throw new Error('Unexpected API response');
      return response.data;
    },
    [api],
  );

  const getComplianceResourceUrl = useCallback(
    async (organizationId: string, framework: string) => {
      const response = await api.post<ComplianceResourceUrlResponse>(
        '/v1/trust-portal/compliance-resources/signed-url',
        { organizationId, framework },
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.signedUrl) throw new Error('Preview link unavailable');
      return response.data;
    },
    [api],
  );

  const saveOverview = useCallback(
    async (data: OverviewData) => {
      const response = await api.post('/v1/trust-portal/overview', data);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const updateVendorTrustSettings = useCallback(
    async (vendorId: string, data: VendorTrustSettingsData) => {
      const response = await api.post(
        `/v1/trust-portal/vendors/${vendorId}/trust-settings`,
        data,
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const updateAllowedDomains = useCallback(
    async (domains: string[]) => {
      const response = await api.put(
        '/v1/trust-portal/settings/allowed-domains',
        { domains },
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const uploadFavicon = useCallback(
    async (fileName: string, fileType: string, fileData: string) => {
      const response = await api.post<FaviconUploadResponse>(
        '/v1/trust-portal/favicon',
        { fileName, fileType, fileData },
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const removeFavicon = useCallback(async () => {
    const response = await api.delete('/v1/trust-portal/favicon');
    if (response.error) throw new Error(response.error);
    return response.data;
  }, [api]);

  const submitCustomDomain = useCallback(
    async (domain: string) => {
      const response = await api.post<{
        success: boolean;
        needsVerification?: boolean;
        error?: string;
      }>('/v1/trust-portal/settings/custom-domain', { domain });
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  const checkDns = useCallback(
    async (domain: string) => {
      const response = await api.post<{
        success: boolean;
        isCnameVerified?: boolean;
        isTxtVerified?: boolean;
        isVercelTxtVerified?: boolean;
        error?: string;
      }>('/v1/trust-portal/settings/check-dns', { domain });
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    [api],
  );

  return {
    updateToggleSettings,
    updateFrameworkSettings,
    uploadComplianceResource,
    getComplianceResourceUrl,
    saveOverview,
    updateVendorTrustSettings,
    updateAllowedDomains,
    uploadFavicon,
    removeFavicon,
    submitCustomDomain,
    checkDns,
  };
}

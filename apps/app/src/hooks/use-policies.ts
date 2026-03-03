'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import { api as apiClient, ApiResponse } from '@/lib/api-client';
import { useCallback } from 'react';
import type { Policy } from '@db';

interface PoliciesResponse {
  data: Policy[];
}

export interface BulkUploadFileEntry {
  fileName: string;
  fileType: string;
  fileData: string;
}

interface BulkUploadResponse {
  success: boolean;
  results: {
    fileName: string;
    policyId: string;
    success: boolean;
    error?: string;
  }[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

interface BulkDeleteResponse {
  success: boolean;
  deletedCount: number;
}

interface DownloadAllResponse {
  name: string;
  downloadUrl: string;
  policyCount: number;
}

export interface UsePoliciesOptions
  extends UseApiSWROptions<PoliciesResponse> {
  initialData?: Policy[];
}

export function usePolicies(options: UsePoliciesOptions = {}) {
  const { initialData, ...restOptions } = options;

  return useApiSWR<PoliciesResponse>('/v1/policies', {
    ...restOptions,
    refreshInterval: restOptions.refreshInterval ?? 30000,
    ...(initialData && {
      fallbackData: {
        data: { data: initialData },
        status: 200,
      } as ApiResponse<PoliciesResponse>,
    }),
  });
}

export function usePolicyActions() {
  const api = useApi();

  const bulkUpload = useCallback(
    async (files: BulkUploadFileEntry[]) => {
      const response = await api.post<BulkUploadResponse>(
        '/v1/policies/bulk',
        { files },
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const bulkDelete = useCallback(
    async (policyIds: string[]) => {
      const orgId = api.organizationId;
      const response = await apiClient.delete<BulkDeleteResponse>(
        '/v1/policies/bulk',
        orgId,
        { policyIds },
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const downloadAll = useCallback(async () => {
    const response = await api.get<DownloadAllResponse>(
      '/v1/policies/download-all',
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }, [api]);

  return {
    bulkUpload,
    bulkDelete,
    downloadAll,
  };
}

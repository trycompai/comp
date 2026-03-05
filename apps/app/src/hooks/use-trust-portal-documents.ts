'use client';

import { useApi } from '@/hooks/use-api';
import { useCallback, useState } from 'react';

export interface TrustPortalDocument {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UploadDocumentResponse {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DownloadDocumentResponse {
  signedUrl: string;
  fileName: string;
}

interface DeleteDocumentResponse {
  success: boolean;
}

interface UseTrustPortalDocumentsOptions {
  organizationId: string;
  initialData?: TrustPortalDocument[];
}

export function useTrustPortalDocuments({
  organizationId,
  initialData = [],
}: UseTrustPortalDocumentsOptions) {
  const api = useApi();
  const [documents, setDocuments] = useState<TrustPortalDocument[]>(initialData);

  const refreshDocuments = useCallback(async () => {
    const response = await api.post<TrustPortalDocument[]>(
      '/v1/trust-portal/documents/list',
      { organizationId },
    );
    if (response.data && Array.isArray(response.data)) {
      setDocuments(response.data);
    }
  }, [api, organizationId]);

  const uploadDocument = useCallback(
    async (fileName: string, fileType: string, fileData: string) => {
      const response = await api.post<UploadDocumentResponse>(
        '/v1/trust-portal/documents/upload',
        { organizationId, fileName, fileType, fileData },
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.id) throw new Error('Invalid upload response');
      await refreshDocuments();
      return response.data;
    },
    [api, organizationId, refreshDocuments],
  );

  const downloadDocument = useCallback(
    async (documentId: string) => {
      const response = await api.post<DownloadDocumentResponse>(
        `/v1/trust-portal/documents/${documentId}/download`,
        { organizationId },
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.signedUrl) throw new Error('Invalid download response');
      return response.data;
    },
    [api, organizationId],
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      const response = await api.post<DeleteDocumentResponse>(
        `/v1/trust-portal/documents/${documentId}/delete`,
        { organizationId },
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.success) throw new Error('Delete failed');
      await refreshDocuments();
      return response.data;
    },
    [api, organizationId, refreshDocuments],
  );

  return {
    documents,
    uploadDocument,
    downloadDocument,
    deleteDocument,
  };
}

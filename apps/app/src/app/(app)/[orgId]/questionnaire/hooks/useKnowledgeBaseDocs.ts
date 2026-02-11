'use client';

import useSWR from 'swr';
import { api } from '@/lib/api-client';
import type { KBDocument } from '../components/types';

const KB_DOCS_KEY = '/v1/knowledge-base/documents';

async function fetchDocuments(): Promise<KBDocument[]> {
  const response = await api.get<KBDocument[]>(KB_DOCS_KEY);
  if (response.error) throw new Error(response.error);
  return Array.isArray(response.data) ? response.data : [];
}

interface UseKnowledgeBaseDocsOptions {
  organizationId: string;
  fallbackData?: KBDocument[];
}

interface UploadResponse {
  id: string;
  name: string;
  s3Key: string;
}

interface ProcessResponse {
  success: boolean;
  runId?: string;
  publicAccessToken?: string;
  message?: string;
}

interface DeleteResponse {
  success: boolean;
  vectorDeletionRunId?: string;
  publicAccessToken?: string;
}

interface DownloadResponse {
  signedUrl: string;
  fileName: string;
}

export function useKnowledgeBaseDocs({ organizationId, fallbackData }: UseKnowledgeBaseDocsOptions) {
  const { data, error, isLoading, mutate } = useSWR<KBDocument[]>(
    KB_DOCS_KEY,
    fetchDocuments,
    {
      fallbackData,
      revalidateOnMount: fallbackData === undefined,
    },
  );

  const uploadDocument = async (
    fileName: string,
    fileType: string,
    fileData: string,
  ): Promise<UploadResponse> => {
    const response = await api.post<UploadResponse>(
      '/v1/knowledge-base/documents/upload',
      { fileName, fileType, fileData, organizationId },
    );

    if (response.error) throw new Error(response.error || 'Failed to upload file');
    if (!response.data?.id) throw new Error('Failed to upload file: invalid response');

    return response.data;
  };

  const processDocuments = async (
    documentIds: string[],
  ): Promise<ProcessResponse> => {
    const response = await api.post<ProcessResponse>(
      '/v1/knowledge-base/documents/process',
      { documentIds, organizationId },
    );

    if (response.error) throw new Error(response.error);
    return response.data ?? { success: false };
  };

  const deleteDocument = async (
    documentId: string,
  ): Promise<DeleteResponse> => {
    const response = await api.post<DeleteResponse>(
      `/v1/knowledge-base/documents/${documentId}/delete`,
      { organizationId },
    );

    if (response.error) throw new Error(response.error || 'Failed to delete document');
    if (!response.data?.success) throw new Error('Failed to delete document: invalid response');

    await mutate(
      (current) => {
        if (!Array.isArray(current)) return current;
        return current.filter((d) => d.id !== documentId);
      },
      { revalidate: false },
    );

    return response.data;
  };

  const downloadDocument = async (
    documentId: string,
  ): Promise<DownloadResponse> => {
    const response = await api.post<DownloadResponse>(
      `/v1/knowledge-base/documents/${documentId}/download`,
      { organizationId },
    );

    if (response.error) throw new Error(response.error || 'Failed to download file');
    if (!response.data?.signedUrl) throw new Error('Failed to download file: invalid response');

    return response.data;
  };

  const revalidate = async () => {
    await mutate();
  };

  return {
    documents: Array.isArray(data) ? data : [],
    error,
    isLoading,
    mutate,
    uploadDocument,
    processDocuments,
    deleteDocument,
    downloadDocument,
    revalidate,
  };
}

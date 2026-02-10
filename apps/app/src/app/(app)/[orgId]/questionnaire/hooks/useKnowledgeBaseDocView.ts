'use client';

import { api } from '@/lib/api-client';

interface ViewResponse {
  signedUrl: string;
  fileName: string;
  fileType: string;
  viewableInBrowser: boolean;
}

export function useKnowledgeBaseDocView(organizationId: string) {
  const viewDocument = async (documentId: string): Promise<ViewResponse> => {
    const response = await api.post<ViewResponse>(
      `/v1/knowledge-base/documents/${documentId}/view`,
      { organizationId },
    );

    if (response.error) throw new Error(response.error);
    if (!response.data) throw new Error('Failed to get document view URL');

    return response.data;
  };

  return { viewDocument };
}

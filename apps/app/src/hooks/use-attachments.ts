'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';

interface DownloadUrlResponse {
  downloadUrl: string;
}

/**
 * Hook for attachment-related API operations.
 * Used by task item description views and rich text editors.
 */
export function useAttachments() {
  const getDownloadUrl = useCallback(
    async (attachmentId: string): Promise<string | null> => {
      if (!attachmentId) return null;
      const response = await apiClient.get<DownloadUrlResponse>(
        `/v1/attachments/${attachmentId}/download`,
      );
      if (response.error || !response.data?.downloadUrl) {
        throw new Error(response.error || 'Download URL not available');
      }
      return response.data.downloadUrl;
    },
    [],
  );

  const deleteAttachment = useCallback(
    async (attachmentId: string): Promise<void> => {
      if (!attachmentId) {
        throw new Error('Attachment ID is required');
      }
      const response = await apiClient.delete(
        `/v1/task-management/attachments/${attachmentId}`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
    },
    [],
  );

  return { getDownloadUrl, deleteAttachment };
}

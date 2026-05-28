'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR } from '@/hooks/use-api-swr';
import { useCallback } from 'react';

type EventType = 'onboard' | 'offboard';

interface AttachmentMetadata {
  id: string;
  name: string;
  type: string;
  downloadUrl: string;
  createdAt: string;
}

export function useEmploymentEvidence({
  memberId,
  eventType,
}: {
  memberId: string;
  eventType: EventType;
}) {
  const api = useApi();
  const endpoint = `/v1/people/${memberId}/employment-evidence/${eventType}`;

  const { data, error, isLoading, mutate } = useApiSWR<AttachmentMetadata[]>(endpoint);
  const attachments = data?.data ?? [];

  const uploadEvidence = useCallback(
    (file: File): Promise<AttachmentMetadata> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];

            const response = await api.post<AttachmentMetadata>(endpoint, {
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              fileData: base64Data,
            });

            if (response.error) {
              throw new Error(response.error);
            }

            await mutate();
            resolve(response.data!);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    [api, endpoint, mutate],
  );

  const deleteEvidence = useCallback(
    async (attachmentId: string) => {
      const response = await api.delete(`${endpoint}/${attachmentId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      await mutate();
      return { success: true };
    },
    [api, endpoint, mutate],
  );

  const getDownloadUrl = useCallback(
    async (attachmentId: string) => {
      const response = await api.get<{ downloadUrl: string }>(
        `/v1/attachments/${attachmentId}/download`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!.downloadUrl;
    },
    [api],
  );

  return {
    attachments,
    isLoading,
    error,
    uploadEvidence,
    deleteEvidence,
    getDownloadUrl,
  };
}

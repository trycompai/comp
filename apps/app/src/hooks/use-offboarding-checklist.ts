'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR } from '@/hooks/use-api-swr';
import { fileToBase64 } from '@/lib/file-utils';
import { useCallback } from 'react';

interface CompletedBy {
  id: string;
  name: string;
  email: string;
}

interface EvidenceAttachment {
  id: string;
  name: string;
  type: string;
  downloadUrl: string;
  createdAt: string;
}

export interface ChecklistItem {
  templateItemId: string;
  title: string;
  description: string | null;
  evidenceRequired: boolean;
  isAccessRevocation: boolean;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
  completedBy: CompletedBy | null;
  completionId: string | null;
  notes: string | null;
  evidence: EvidenceAttachment[];
}

interface MemberChecklistResponse {
  items: ChecklistItem[];
  totalItems: number;
  completedItems: number;
}

export function useOffboardingChecklist(memberId: string) {
  const api = useApi();
  const endpoint = `/v1/offboarding-checklist/member/${memberId}`;

  const { data, error, isLoading, mutate } = useApiSWR<MemberChecklistResponse>(endpoint);
  const checklist = data?.data ?? null;

  const completeItem = useCallback(
    async ({
      templateItemId,
      notes,
      file,
    }: {
      templateItemId: string;
      notes?: string;
      file?: File;
    }) => {
      let body: Record<string, unknown> = {};
      if (notes) body.notes = notes;

      if (file) {
        const base64 = await fileToBase64(file);
        body = {
          ...body,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileData: base64,
        };
      }

      const response = await api.post(
        `/v1/offboarding-checklist/member/${memberId}/item/${templateItemId}/complete`,
        body,
      );
      if (response.error) throw new Error(response.error);
      await mutate();
    },
    [api, memberId, mutate],
  );

  const uncompleteItem = useCallback(
    async (templateItemId: string) => {
      const response = await api.delete(
        `/v1/offboarding-checklist/member/${memberId}/item/${templateItemId}/complete`,
      );
      if (response.error) throw new Error(response.error);
      await mutate();
    },
    [api, memberId, mutate],
  );

  const uploadEvidence = useCallback(
    async (templateItemId: string, file: File) => {
      const base64 = await fileToBase64(file);
      const response = await api.post(
        `/v1/offboarding-checklist/member/${memberId}/item/${templateItemId}/evidence`,
        {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileData: base64,
        },
      );
      if (response.error) throw new Error(response.error);
      await mutate();
    },
    [api, memberId, mutate],
  );

  const getDownloadUrl = useCallback(
    async (attachmentId: string) => {
      const response = await api.get<{ downloadUrl: string }>(
        `/v1/attachments/${attachmentId}/download`,
      );
      if (response.error) throw new Error(response.error);
      return response.data!.downloadUrl;
    },
    [api],
  );

  return {
    checklist,
    isLoading,
    error,
    completeItem,
    uncompleteItem,
    uploadEvidence,
    getDownloadUrl,
    refreshChecklist: mutate,
  };
}

'use client';

import useSWR from 'swr';
import { api } from '@/lib/api-client';

interface SOADocumentData {
  id: string;
  status: string;
  approverId?: string | null;
  answers: Array<{
    questionId: string;
    answer: string | null;
    answerVersion: number;
  }>;
  [key: string]: unknown;
}

interface UseSOADocumentOptions {
  documentId: string | null;
  organizationId: string;
  fallbackData?: SOADocumentData | null;
}

function buildKey(documentId: string | null) {
  if (!documentId) return null;
  return `/v1/soa/document/${documentId}`;
}

export function useSOADocument({ documentId, organizationId, fallbackData }: UseSOADocumentOptions) {
  const { data, error, isLoading, mutate } = useSWR<SOADocumentData | null>(
    buildKey(documentId),
    // We don't fetch via GET since SOA data comes from the server page setup.
    // The key is used only for cache identity so mutate() works across components.
    null,
    {
      fallbackData: fallbackData ?? undefined,
      revalidateOnMount: false,
      revalidateOnFocus: false,
    },
  );

  const saveAnswer = async (params: {
    questionId: string;
    answer: string | null;
    isApplicable: boolean | null;
    justification: string | null;
  }): Promise<boolean> => {
    if (!documentId) throw new Error('No document ID');

    const response = await api.post<{ success: boolean }>(
      '/v1/soa/save-answer',
      {
        organizationId,
        documentId,
        ...params,
      },
    );

    if (response.error) throw new Error(response.error);
    if (!response.data?.success) throw new Error('Failed to save answer');

    await mutate();
    return true;
  };

  const approve = async (): Promise<boolean> => {
    if (!documentId) throw new Error('No document ID');

    const response = await api.post<{ success: boolean; data?: unknown }>(
      '/v1/soa/approve',
      { organizationId, documentId },
    );

    if (response.error) throw new Error(response.error || 'Failed to approve SOA document');
    if (!response.data?.success) throw new Error('Failed to approve SOA document');

    await mutate();
    return true;
  };

  const decline = async (): Promise<boolean> => {
    if (!documentId) throw new Error('No document ID');

    const response = await api.post<{ success: boolean; data?: unknown }>(
      '/v1/soa/decline',
      { organizationId, documentId },
    );

    if (response.error) throw new Error(response.error || 'Failed to decline SOA document');
    if (!response.data?.success) throw new Error('Failed to decline SOA document');

    await mutate();
    return true;
  };

  const submitForApproval = async (approverId: string): Promise<boolean> => {
    if (!documentId) throw new Error('No document ID');

    const response = await api.post<{ success: boolean; data?: unknown }>(
      '/v1/soa/submit-for-approval',
      { organizationId, documentId, approverId },
    );

    if (response.error) throw new Error(response.error || 'Failed to submit for approval');
    if (!response.data?.success) throw new Error('Failed to submit for approval');

    await mutate();
    return true;
  };

  return {
    document: data ?? null,
    error,
    isLoading,
    mutate,
    saveAnswer,
    approve,
    decline,
    submitForApproval,
  };
}

/** Standalone helper: create a new SOA document (navigates away after, no cache to update) */
export async function createSOADocument(params: {
  frameworkId: string;
  organizationId: string;
}): Promise<{ id: string }> {
  const response = await api.post<{ success: boolean; data?: { id: string } }>(
    '/v1/soa/create-document',
    params,
  );

  if (response.error) throw new Error(response.error || 'Failed to create SOA document');
  if (!response.data?.success || !response.data?.data) {
    throw new Error('Failed to create SOA document');
  }

  return response.data.data;
}

/** Standalone helper: ensure SOA setup for a framework */
export async function ensureSOASetup(params: {
  frameworkId: string;
  organizationId: string;
}): Promise<{
  success: boolean;
  configuration?: Record<string, unknown> | null;
  document?: Record<string, unknown> | null;
  error?: string;
}> {
  const response = await api.post<{
    success: boolean;
    configuration?: Record<string, unknown> | null;
    document?: Record<string, unknown> | null;
    error?: string;
  }>('/v1/soa/ensure-setup', params);

  if (response.error) throw new Error(response.error || 'Failed to setup SOA');
  if (!response.data) throw new Error('Failed to setup SOA');

  return response.data;
}

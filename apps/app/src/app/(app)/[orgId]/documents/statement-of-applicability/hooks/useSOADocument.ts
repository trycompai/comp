'use client';

import useSWR from 'swr';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { env } from '@/env.mjs';
import { toast } from 'sonner';

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
  const [isExporting, setIsExporting] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<SOADocumentData | null>(
    buildKey(documentId),
    null,
    {
      fallbackData: fallbackData ?? undefined,
      revalidateOnMount: false,
      revalidateOnFocus: false,
    },
  );

  // Seed the SWR cache with fallbackData so mutate() updaters work correctly
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && fallbackData) {
      seeded.current = true;
      mutate(fallbackData, false);
    }
  }, [fallbackData, mutate]);

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

    if (data) {
      await mutate({ ...data, status: 'approved', approvedAt: new Date().toISOString() }, false);
    }
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

    if (data) {
      await mutate({ ...data, status: 'needs_review', declinedAt: new Date().toISOString() }, false);
    }
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

    // Optimistically update cached document status
    if (data) {
      await mutate({ ...data, status: 'pending_approval', approverId }, false);
    }
    return true;
  };

  const handleExport = async (format: 'pdf' = 'pdf'): Promise<void> => {
    if (!documentId) {
      toast.error('No SOA document to export');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/v1/soa/export`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            organizationId,
            format,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to export SOA document');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `statement-of-applicability.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported as ${filename}`);
    } catch (error) {
      console.error('SOA export error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to export SOA document',
      );
    } finally {
      setIsExporting(false);
    }
  };

  return {
    document: data ?? null,
    error,
    isLoading,
    isExporting,
    mutate,
    saveAnswer,
    approve,
    decline,
    submitForApproval,
    handleExport,
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

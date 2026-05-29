'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { env } from '@/env.mjs';
import type {
  IsmsContextIssueKind,
  IsmsDocument,
  IsmsDriftResult,
  IsmsExportFormat,
} from '../isms-types';

interface UseIsmsDocumentOptions {
  documentId: string | null;
  organizationId: string;
  fallbackData?: IsmsDocument | null;
}

interface IssueInput {
  kind: IsmsContextIssueKind;
  description: string;
  effect: string;
  position?: number;
}

interface IssueUpdateInput {
  kind?: IsmsContextIssueKind;
  description?: string;
  effect?: string;
  position?: number;
}

function buildKey(documentId: string | null) {
  if (!documentId) return null;
  return `/v1/isms/documents/${documentId}`;
}

async function unwrap<T>(promise: Promise<{ data?: T; error?: string }>, fallbackError: string) {
  const response = await promise;
  if (response.error || !response.data) {
    throw new Error(response.error ?? fallbackError);
  }
  return response.data;
}

export function useIsmsDocument({
  documentId,
  organizationId,
  fallbackData,
}: UseIsmsDocumentOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<IsmsDocument | null>(
    buildKey(documentId),
    async (key: string) => unwrap<IsmsDocument>(api.get<IsmsDocument>(key), 'Failed to load document'),
    {
      fallbackData: fallbackData ?? undefined,
      revalidateOnMount: !fallbackData,
      revalidateOnFocus: false,
    },
  );

  // Seed the SWR cache with fallbackData so mutate() updaters work correctly.
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && fallbackData) {
      seeded.current = true;
      void mutate(fallbackData, false);
    }
  }, [fallbackData, mutate]);

  const refresh = async (): Promise<void> => {
    if (!documentId) return;
    await mutate();
  };

  const generate = async (): Promise<IsmsDocument> => {
    if (!documentId) throw new Error('No document ID');
    const result = await unwrap<IsmsDocument>(
      api.post<IsmsDocument>(`/v1/isms/documents/${documentId}/generate`, {}),
      'Failed to generate document',
    );
    await mutate(result, false);
    return result;
  };

  const createIssue = async (input: IssueInput): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    await unwrap(
      api.post(`/v1/isms/documents/${documentId}/context-issues`, input),
      'Failed to add issue',
    );
    await mutate();
  };

  const updateIssue = async ({
    issueId,
    input,
  }: {
    issueId: string;
    input: IssueUpdateInput;
  }): Promise<void> => {
    await unwrap(api.post(`/v1/isms/context-issues/${issueId}`, input), 'Failed to update issue');
    await mutate();
  };

  const deleteIssue = async (issueId: string): Promise<void> => {
    const response = await api.delete(`/v1/isms/context-issues/${issueId}`);
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  const submitForApproval = async (approverId: string): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    const result = await unwrap<IsmsDocument>(
      api.post<IsmsDocument>(`/v1/isms/documents/${documentId}/submit-for-approval`, {
        approverId,
      }),
      'Failed to submit for approval',
    );
    await mutate(result, false);
  };

  const approve = async (): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    const result = await unwrap<IsmsDocument>(
      api.post<IsmsDocument>(`/v1/isms/documents/${documentId}/approve`, {}),
      'Failed to approve document',
    );
    await mutate(result, false);
  };

  const decline = async (): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    const result = await unwrap<IsmsDocument>(
      api.post<IsmsDocument>(`/v1/isms/documents/${documentId}/decline`, {}),
      'Failed to decline document',
    );
    await mutate(result, false);
  };

  const getDrift = async (): Promise<IsmsDriftResult> => {
    if (!documentId) throw new Error('No document ID');
    return unwrap<IsmsDriftResult>(
      api.get<IsmsDriftResult>(`/v1/isms/documents/${documentId}/drift`),
      'Failed to load drift status',
    );
  };

  const handleExport = async (format: IsmsExportFormat): Promise<void> => {
    if (!documentId) {
      toast.error('No document to export');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/v1/isms/documents/${documentId}/export`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to export document');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `isms-document.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
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
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to export document');
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
    refresh,
    generate,
    createIssue,
    updateIssue,
    deleteIssue,
    submitForApproval,
    approve,
    decline,
    getDrift,
    handleExport,
  };
}

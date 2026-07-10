'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { IsmsContextIssueKind, IsmsDocument, IsmsExportFormat } from '../isms-types';
import { exportIsmsDocument } from './exportIsmsDocument';

interface UseIsmsDocumentOptions {
  documentId: string | null;
  organizationId: string;
  fallbackData?: IsmsDocument | null;
}

/**
 * Register identifiers shared across every ISMS document type. The endpoint
 * segment is identical for create / update / delete:
 *   POST   /v1/isms/documents/:id/<segment>
 *   POST   /v1/isms/<segment>/:rowId
 *   DELETE /v1/isms/<segment>/:rowId
 */
export type IsmsRegister =
  | 'context-issues'
  | 'interested-parties'
  | 'requirements'
  | 'objectives'
  | 'roles'
  | 'role-assignments';

interface IssueInput {
  kind: IsmsContextIssueKind;
  category?: string;
  description: string;
  effect: string;
  position?: number;
}

interface IssueUpdateInput {
  kind?: IsmsContextIssueKind;
  category?: string;
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
    async (key: string) =>
      unwrap<IsmsDocument>(api.get<IsmsDocument>(key), 'Failed to load document'),
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

  const generate = async (): Promise<IsmsDocument> => {
    if (!documentId) throw new Error('No document ID');
    const result = await unwrap<IsmsDocument>(
      api.post<IsmsDocument>(`/v1/isms/documents/${documentId}/generate`, {}),
      'Failed to generate document',
    );
    // Revalidate from the server so registers + control links are preserved
    // (the generate response omits some relations).
    await mutate();
    return result;
  };

  // --- Generic register row CRUD (works for every register) ---

  const createRow = async ({
    register,
    data: rowData,
  }: {
    register: IsmsRegister;
    data: Record<string, unknown>;
  }): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    await unwrap(
      api.post(`/v1/isms/documents/${documentId}/registers/${register}`, rowData),
      'Failed to add row',
    );
    await mutate();
  };

  const updateRow = async ({
    register,
    id,
    data: rowData,
  }: {
    register: IsmsRegister;
    id: string;
    data: Record<string, unknown>;
  }): Promise<void> => {
    await unwrap(
      api.patch(`/v1/isms/registers/${register}/${id}`, rowData),
      'Failed to update row',
    );
    await mutate();
  };

  const deleteRow = async ({
    register,
    id,
  }: {
    register: IsmsRegister;
    id: string;
  }): Promise<void> => {
    const response = await api.delete(`/v1/isms/registers/${register}/${id}`);
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  // --- Singleton narrative (scope 4.3, leadership 5.1) ---

  const saveNarrative = async (narrative: Record<string, unknown>): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    await unwrap(
      api.post(`/v1/isms/documents/${documentId}/narrative`, { narrative }),
      'Failed to save document',
    );
    await mutate();
  };

  // --- Context-issue wrappers (kept for ContextOfOrganizationClient) ---

  const createIssue = async (input: IssueInput): Promise<void> => {
    await createRow({ register: 'context-issues', data: { ...input } });
  };

  const updateIssue = async ({
    issueId,
    input,
  }: {
    issueId: string;
    input: IssueUpdateInput;
  }): Promise<void> => {
    await updateRow({ register: 'context-issues', id: issueId, data: { ...input } });
  };

  const deleteIssue = async (issueId: string): Promise<void> => {
    await deleteRow({ register: 'context-issues', id: issueId });
  };

  // --- Linked org controls (clause-level control mappings) ---

  const addControlMappings = async (controlIds: string[]): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    await unwrap(
      api.post(`/v1/isms/documents/${documentId}/controls`, { controlIds }),
      'Failed to link controls',
    );
    await mutate();
  };

  const removeControlMapping = async (controlId: string): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    const response = await api.delete(`/v1/isms/documents/${documentId}/controls/${controlId}`);
    if (response.error) throw new Error(response.error);
    await mutate();
  };

  // The lifecycle endpoints below return a partial document (no registers /
  // control links), so we revalidate from the server instead of caching the
  // partial response, which would wipe that data client-side.
  const submitForApproval = async (approverId: string): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    await unwrap<IsmsDocument>(
      api.post<IsmsDocument>(`/v1/isms/documents/${documentId}/submit-for-approval`, {
        approverId,
      }),
      'Failed to submit for approval',
    );
    await mutate();
  };

  const approve = async (): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    await unwrap<IsmsDocument>(
      api.post<IsmsDocument>(`/v1/isms/documents/${documentId}/approve`, {}),
      'Failed to approve document',
    );
    await mutate();
  };

  const decline = async (): Promise<void> => {
    if (!documentId) throw new Error('No document ID');
    await unwrap<IsmsDocument>(
      api.post<IsmsDocument>(`/v1/isms/documents/${documentId}/decline`, {}),
      'Failed to decline document',
    );
    await mutate();
  };

  const handleExport = async (format: IsmsExportFormat): Promise<void> => {
    if (!documentId) {
      toast.error('No document to export');
      return;
    }

    setIsExporting(true);
    try {
      await exportIsmsDocument({ documentId, format });
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
    // Revalidate the document from the server (used by the shell's error-retry UX).
    refresh: () => mutate(),
    generate,
    createRow,
    updateRow,
    deleteRow,
    saveNarrative,
    createIssue,
    updateIssue,
    deleteIssue,
    addControlMappings,
    removeControlMapping,
    submitForApproval,
    approve,
    decline,
    handleExport,
  };
}

/** The full surface returned by {@link useIsmsDocument}. */
export type UseIsmsDocumentReturn = ReturnType<typeof useIsmsDocument>;

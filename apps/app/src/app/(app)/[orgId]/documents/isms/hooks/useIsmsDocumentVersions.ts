'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api-client';
import type { IsmsExportFormat, IsmsVersionHistory } from '../isms-types';
import { exportIsmsDocument } from './exportIsmsDocument';

/**
 * Published version history for an ISMS document (CS-701). Keyed on
 * `['/v1/isms/documents', documentId, 'versions']` so the detail page's history
 * section stays in sync. Exposes a `downloadVersion` helper that fetches a
 * specific published version's stored export, and `mutateVersions` to revalidate
 * after an approval promotes a new version.
 */
export function useIsmsDocumentVersions(
  documentId: string | null,
  organizationId?: string,
) {
  const { data, error, isLoading, mutate } = useSWR<IsmsVersionHistory>(
    documentId
      ? (['/v1/isms/documents', documentId, 'versions'] as const)
      : null,
    async ([base, id]: readonly [string, string, string]) => {
      const response = await api.get<IsmsVersionHistory>(`${base}/${id}/versions`);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load version history');
      }
      return response.data;
    },
  );

  const [downloadingVersionId, setDownloadingVersionId] = useState<string | null>(
    null,
  );

  const downloadVersion = async (
    versionId: string,
    format: IsmsExportFormat,
  ): Promise<void> => {
    if (!documentId) return;
    setDownloadingVersionId(versionId);
    try {
      await exportIsmsDocument({
        documentId,
        format,
        organizationId,
        versionId,
      });
    } finally {
      setDownloadingVersionId(null);
    }
  };

  return {
    history: data ?? null,
    versions: data?.versions ?? [],
    currentVersionId: data?.currentVersionId ?? null,
    error,
    isLoading,
    downloadingVersionId,
    downloadVersion,
    mutateVersions: mutate,
  };
}

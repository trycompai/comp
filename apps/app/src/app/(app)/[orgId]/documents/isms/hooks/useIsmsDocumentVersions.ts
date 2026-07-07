'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
      ? (['/v1/isms/documents', documentId, 'versions', organizationId] as const)
      : null,
    async ([base, id, , orgId]: readonly [
      string,
      string,
      string,
      string | undefined,
    ]) => {
      // Pass the route org so history stays in the same org context as the
      // per-version downloads (X-Organization-Id), not the session's active org.
      const response = await api.get<IsmsVersionHistory>(
        `${base}/${id}/versions`,
        orgId,
      );
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
    } catch (caught) {
      // Surface the failure instead of a silent no-op / unhandled rejection.
      toast.error(
        caught instanceof Error ? caught.message : 'Failed to download version',
      );
    } finally {
      // Only clear if this request still owns the indicator — a later download of
      // a different version must not have its spinner cleared by an earlier one.
      setDownloadingVersionId((current) =>
        current === versionId ? null : current,
      );
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

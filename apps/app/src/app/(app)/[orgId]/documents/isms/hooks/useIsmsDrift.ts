'use client';

import useSWR from 'swr';
import { api } from '@/lib/api-client';
import type { IsmsDriftResult } from '../isms-types';

/**
 * Reactive drift status for an ISMS document, shared by every detail client and
 * the overview. Keyed on `['/v1/isms/documents', documentId, 'drift']` so a
 * single cache entry is reused (and revalidated) across the page. Returns the
 * raw result plus a convenience `isStale` flag and a `mutateDrift` revalidator
 * to call after a regenerate.
 */
export function useIsmsDrift(documentId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<IsmsDriftResult>(
    documentId ? (['/v1/isms/documents', documentId, 'drift'] as const) : null,
    async ([base, id]: readonly [string, string, string]) => {
      const response = await api.get<IsmsDriftResult>(`${base}/${id}/drift`);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load drift status');
      }
      return response.data;
    },
  );

  return {
    drift: data ?? null,
    isStale: !!data?.isStale,
    error,
    isLoading,
    mutateDrift: mutate,
  };
}

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api-client';

// Capture the SWR key + fetcher so we can assert the endpoint without firing it
// on mount. `vi.hoisted` keeps the holder available inside the hoisted vi.mock.
const swr = vi.hoisted(() => ({
  key: undefined as unknown,
  fetcher: null as null | ((key: unknown) => unknown),
}));

vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn() },
}));

vi.mock('swr', () => ({
  default: (key: unknown, fetcher: (k: unknown) => unknown) => {
    swr.key = key;
    swr.fetcher = fetcher;
    return { data: undefined, error: undefined, isLoading: false, mutate: vi.fn() };
  },
}));

vi.mock('./exportIsmsDocument', () => ({
  exportIsmsDocument: vi.fn().mockResolvedValue(undefined),
}));

import { useIsmsDocumentVersions } from './useIsmsDocumentVersions';
import { exportIsmsDocument } from './exportIsmsDocument';

const getMock = vi.mocked(api.get);
const exportMock = vi.mocked(exportIsmsDocument);

const DOC_ID = 'doc_1';
const ORG_ID = 'org_1';

beforeEach(() => {
  vi.clearAllMocks();
  swr.key = undefined;
  swr.fetcher = null;
});

describe('useIsmsDocumentVersions', () => {
  it('keys SWR on the document and fetches GET /v1/isms/documents/:id/versions', async () => {
    getMock.mockResolvedValue({ data: { currentVersionId: null, versions: [] }, status: 200 });

    renderHook(() => useIsmsDocumentVersions(DOC_ID, ORG_ID));

    expect(swr.key).toEqual(['/v1/isms/documents', DOC_ID, 'versions']);
    await swr.fetcher?.(['/v1/isms/documents', DOC_ID, 'versions']);
    expect(getMock).toHaveBeenCalledWith(`/v1/isms/documents/${DOC_ID}/versions`);
  });

  it('does not fetch when no document id is provided', () => {
    renderHook(() => useIsmsDocumentVersions(null, ORG_ID));
    expect(swr.key).toBeNull();
  });

  it('downloads a specific published version via exportIsmsDocument', async () => {
    const { result } = renderHook(() => useIsmsDocumentVersions(DOC_ID, ORG_ID));

    await act(async () => {
      await result.current.downloadVersion('isms_ver_1', 'pdf');
    });

    expect(exportMock).toHaveBeenCalledWith({
      documentId: DOC_ID,
      format: 'pdf',
      organizationId: ORG_ID,
      versionId: 'isms_ver_1',
    });
  });
});

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api-client';
import type { IsmsDocument } from '../isms-types';

// ─── Mock the api client (the unit under test is the hook, not the client) ───
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// ─── Stub SWR so the fetcher never fires and mutate() is an inert no-op ──────
// We only care about which verb+URL+body each method sends to the api client.
const mutateMock = vi.fn().mockResolvedValue(undefined);
vi.mock('swr', () => ({
  default: () => ({
    data: null,
    error: undefined,
    isLoading: false,
    mutate: mutateMock,
  }),
}));

// exportIsmsDocument is exercised in its own test; here we assert the hook
// delegates to it with the right arguments.
vi.mock('./exportIsmsDocument', () => ({
  exportIsmsDocument: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useIsmsDocument } from './useIsmsDocument';
import { exportIsmsDocument } from './exportIsmsDocument';

const getMock = vi.mocked(api.get);
const postMock = vi.mocked(api.post);
const patchMock = vi.mocked(api.patch);
const deleteMock = vi.mocked(api.delete);
const exportMock = vi.mocked(exportIsmsDocument);

const DOC_ID = 'doc_1';
const ORG_ID = 'org_1';

/** A minimal ok-with-data response so unwrap() resolves. */
function ok<T>(data: T) {
  return { data, status: 200 };
}

function renderDocumentHook(documentId: string | null = DOC_ID) {
  return renderHook(() =>
    useIsmsDocument({ documentId, organizationId: ORG_ID, fallbackData: null }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getMock.mockResolvedValue(ok<IsmsDocument | null>(null));
  postMock.mockResolvedValue(ok({}));
  patchMock.mockResolvedValue(ok({}));
  deleteMock.mockResolvedValue({ status: 204 });
});

describe('useIsmsDocument', () => {
  it('generates via POST /v1/isms/documents/:id/generate', async () => {
    const { result } = renderDocumentHook();

    await result.current.generate();

    expect(postMock).toHaveBeenCalledWith(`/v1/isms/documents/${DOC_ID}/generate`, {});
    expect(mutateMock).toHaveBeenCalled();
  });

  // ─── Asymmetric register routes ───────────────────────────────────────────
  // create is nested under the document; update/delete address the row directly.
  it('createRow POSTs to /v1/isms/documents/:id/registers/:register with the row body', async () => {
    const { result } = renderDocumentHook();

    await result.current.createRow({
      register: 'interested-parties',
      data: { name: 'Customers' },
    });

    expect(postMock).toHaveBeenCalledWith(
      `/v1/isms/documents/${DOC_ID}/registers/interested-parties`,
      { name: 'Customers' },
    );
  });

  it('updateRow PATCHes /v1/isms/registers/:register/:rowId (not nested under the document)', async () => {
    const { result } = renderDocumentHook();

    await result.current.updateRow({
      register: 'objectives',
      id: 'row_9',
      data: { objective: 'Reduce phishing' },
    });

    expect(patchMock).toHaveBeenCalledWith('/v1/isms/registers/objectives/row_9', {
      objective: 'Reduce phishing',
    });
  });

  it('deleteRow DELETEs /v1/isms/registers/:register/:rowId', async () => {
    const { result } = renderDocumentHook();

    await result.current.deleteRow({ register: 'context-issues', id: 'row_3' });

    expect(deleteMock).toHaveBeenCalledWith('/v1/isms/registers/context-issues/row_3');
  });

  it('submitForApproval POSTs the approverId to the submit endpoint', async () => {
    const { result } = renderDocumentHook();

    await result.current.submitForApproval('mem_approver');

    expect(postMock).toHaveBeenCalledWith(
      `/v1/isms/documents/${DOC_ID}/submit-for-approval`,
      { approverId: 'mem_approver' },
    );
  });

  it('approve POSTs to the approve endpoint with an empty body', async () => {
    const { result } = renderDocumentHook();

    await result.current.approve();

    expect(postMock).toHaveBeenCalledWith(`/v1/isms/documents/${DOC_ID}/approve`, {});
  });

  it('decline POSTs to the decline endpoint with an empty body', async () => {
    const { result } = renderDocumentHook();

    await result.current.decline();

    expect(postMock).toHaveBeenCalledWith(`/v1/isms/documents/${DOC_ID}/decline`, {});
  });

  it('handleExport delegates to exportIsmsDocument with the document id + format', async () => {
    const { result } = renderDocumentHook();

    // handleExport flips isExporting state, so drive it through act().
    await act(async () => {
      await result.current.handleExport('docx');
    });

    expect(exportMock).toHaveBeenCalledWith({ documentId: DOC_ID, format: 'docx' });
  });

  it('handleExport does not call the export helper when there is no document id', async () => {
    const { result } = renderDocumentHook(null);

    await result.current.handleExport('pdf');

    expect(exportMock).not.toHaveBeenCalled();
  });

  it('throws (without hitting the network) when generate is called with no document id', async () => {
    const { result } = renderDocumentHook(null);

    await expect(result.current.generate()).rejects.toThrow('No document ID');
    expect(postMock).not.toHaveBeenCalled();
  });
});

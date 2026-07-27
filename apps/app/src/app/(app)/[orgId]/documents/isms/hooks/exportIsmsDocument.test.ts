import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportIsmsDocument } from './exportIsmsDocument';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: { raw: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const rawMock = vi.mocked(api.raw);

function mockResponse({
  ok = true,
  contentDisposition,
  body,
}: {
  ok?: boolean;
  contentDisposition?: string;
  body?: { message?: string };
}): Response {
  return {
    ok,
    headers: {
      get: (name: string) =>
        name === 'Content-Disposition' ? (contentDisposition ?? null) : null,
    },
    blob: async () => new Blob(['data']),
    json: async () => body ?? {},
  } as unknown as Response;
}

/** Capture the anchor the helper creates without triggering a real navigation. */
function captureAnchor(): { current: HTMLAnchorElement | null } {
  const ref: { current: HTMLAnchorElement | null } = { current: null };
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
    if (node instanceof HTMLAnchorElement) ref.current = node;
    return node;
  });
  vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  return ref;
}

describe('exportIsmsDocument', () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('routes the export through the shared apiClient with the org context', async () => {
    rawMock.mockResolvedValue(
      mockResponse({ contentDisposition: 'attachment; filename="doc.pdf"' }),
    );
    captureAnchor();

    await exportIsmsDocument({ documentId: 'doc_123', format: 'pdf', organizationId: 'org_abc' });

    expect(rawMock).toHaveBeenCalledWith(
      '/v1/isms/documents/doc_123/export',
      expect.objectContaining({
        method: 'POST',
        organizationId: 'org_abc',
        body: JSON.stringify({ format: 'pdf' }),
      }),
    );
  });

  it('derives the filename from Content-Disposition', async () => {
    rawMock.mockResolvedValue(
      mockResponse({ contentDisposition: 'attachment; filename="my-isms.docx"' }),
    );
    const anchor = captureAnchor();

    await exportIsmsDocument({ documentId: 'doc_123', format: 'docx' });

    expect(anchor.current?.download).toBe('my-isms.docx');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('falls back to a default filename when no Content-Disposition is present', async () => {
    rawMock.mockResolvedValue(mockResponse({}));
    const anchor = captureAnchor();

    await exportIsmsDocument({ documentId: 'doc_123', format: 'pdf' });

    expect(anchor.current?.download).toBe('isms-document.pdf');
  });

  it('throws the API error message when the response is not ok', async () => {
    rawMock.mockResolvedValue(mockResponse({ ok: false, body: { message: 'boom' } }));

    await expect(
      exportIsmsDocument({ documentId: 'doc_123', format: 'pdf' }),
    ).rejects.toThrow('boom');
  });
});

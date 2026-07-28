import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-server', () => ({
  serverApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { serverApi } from '@/lib/api-server';
import { bulkUploadPoliciesViaApi } from './policies-bulk-upload';

const mockPost = vi.mocked(serverApi.post);

function file(fileName: string) {
  return { fileName, fileType: 'application/pdf', fileData: 'ZmFrZQ==' };
}

describe('bulkUploadPoliciesViaApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a draft policy and attaches its PDF for each file', async () => {
    mockPost
      .mockResolvedValueOnce({ data: { id: 'pol_1' }, status: 201 }) // create A
      .mockResolvedValueOnce({ data: { success: true }, status: 200 }) // attach A
      .mockResolvedValueOnce({ data: { id: 'pol_2' }, status: 201 }) // create B
      .mockResolvedValueOnce({ data: { success: true }, status: 200 }); // attach B

    const result = await bulkUploadPoliciesViaApi({
      files: [file('Access Control Policy.pdf'), file('Data Retention.PDF')],
    });

    expect(result.createdCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.results).toEqual([
      { fileName: 'Access Control Policy.pdf', status: 'created', policyId: 'pol_1' },
      { fileName: 'Data Retention.PDF', status: 'created', policyId: 'pol_2' },
    ]);

    // Create derives the policy name from the file name (extension stripped)
    // and sends empty TipTap content, reusing the standard create pipeline.
    expect(mockPost).toHaveBeenNthCalledWith(1, '/v1/policies', {
      name: 'Access Control Policy',
      content: [],
    });
    // Attach targets the freshly created policy's PDF endpoint with the raw file.
    expect(mockPost).toHaveBeenNthCalledWith(2, '/v1/policies/pol_1/pdf', {
      fileName: 'Access Control Policy.pdf',
      fileType: 'application/pdf',
      fileData: 'ZmFrZQ==',
    });
    expect(mockPost).toHaveBeenNthCalledWith(3, '/v1/policies', {
      name: 'Data Retention',
      content: [],
    });
  });

  it('records the failure and skips the PDF attach when policy creation fails, still processing later files', async () => {
    mockPost
      .mockResolvedValueOnce({ error: 'Forbidden', status: 403 }) // create A fails
      .mockResolvedValueOnce({ data: { id: 'pol_2' }, status: 201 }) // create B
      .mockResolvedValueOnce({ data: { success: true }, status: 200 }); // attach B

    const result = await bulkUploadPoliciesViaApi({
      files: [file('A.pdf'), file('B.pdf')],
    });

    expect(result.createdCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.results[0]).toEqual({
      fileName: 'A.pdf',
      status: 'failed',
      error: 'Forbidden',
      httpStatus: 403,
    });
    expect(result.results[1]).toEqual({
      fileName: 'B.pdf',
      status: 'created',
      policyId: 'pol_2',
    });
    // Failed create (no attach) + create B + attach B = 3 calls total.
    expect(mockPost).toHaveBeenCalledTimes(3);
    // The failed file never triggers a PDF attach.
    expect(mockPost).not.toHaveBeenCalledWith(
      expect.stringContaining('/pdf'),
      expect.objectContaining({ fileName: 'A.pdf' }),
    );
  });

  it('marks the file failed but keeps the created policy id when the PDF attach fails', async () => {
    mockPost
      .mockResolvedValueOnce({ data: { id: 'pol_1' }, status: 201 }) // create
      .mockResolvedValueOnce({ error: 'File too large', status: 400 }); // attach fails

    const result = await bulkUploadPoliciesViaApi({ files: [file('Big.pdf')] });

    expect(result.createdCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.results[0]).toEqual({
      fileName: 'Big.pdf',
      status: 'failed',
      policyId: 'pol_1',
      error: 'File too large',
      httpStatus: 400,
    });
  });
});

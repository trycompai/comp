import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bulkUploadPoliciesViaApi } from './policies-bulk-upload';

/** Build a real File so name/size/type behave like the browser. */
function file(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, {
    type: 'application/pdf',
  });
}

describe('bulkUploadPoliciesViaApi', () => {
  let post: ReturnType<typeof vi.fn>;
  let readFileAsBase64: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    post = vi.fn();
    readFileAsBase64 = vi.fn().mockResolvedValue('ZmFrZQ==');
  });

  it('creates a draft policy and attaches its PDF for each file, in order', async () => {
    post
      .mockResolvedValueOnce({ data: { id: 'pol_1' }, status: 201 }) // create A
      .mockResolvedValueOnce({ data: { success: true }, status: 200 }) // attach A
      .mockResolvedValueOnce({ data: { id: 'pol_2' }, status: 201 }) // create B
      .mockResolvedValueOnce({ data: { success: true }, status: 200 }); // attach B

    const result = await bulkUploadPoliciesViaApi({
      post,
      readFileAsBase64,
      files: [file('Access Control Policy.pdf'), file('Data Retention.PDF')],
      concurrency: 1,
    });

    expect(result.createdCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.results).toEqual([
      {
        fileName: 'Access Control Policy.pdf',
        fileSize: 3,
        status: 'created',
        policyId: 'pol_1',
      },
      {
        fileName: 'Data Retention.PDF',
        fileSize: 3,
        status: 'created',
        policyId: 'pol_2',
      },
    ]);

    // Create derives the policy name from the file name (extension stripped)
    // and sends empty TipTap content, reusing the standard create pipeline.
    expect(post).toHaveBeenNthCalledWith(1, '/v1/policies', {
      name: 'Access Control Policy',
      content: [],
    });
    // Attach targets the freshly created policy's PDF endpoint with the raw file.
    expect(post).toHaveBeenNthCalledWith(2, '/v1/policies/pol_1/pdf', {
      fileName: 'Access Control Policy.pdf',
      fileType: 'application/pdf',
      fileData: 'ZmFrZQ==',
    });
    expect(post).toHaveBeenNthCalledWith(3, '/v1/policies', {
      name: 'Data Retention',
      content: [],
    });
  });

  it('records the failure and skips the PDF attach when policy creation fails, still processing later files', async () => {
    post
      .mockResolvedValueOnce({ error: 'Forbidden', status: 403 }) // create A fails
      .mockResolvedValueOnce({ data: { id: 'pol_2' }, status: 201 }) // create B
      .mockResolvedValueOnce({ data: { success: true }, status: 200 }); // attach B

    const result = await bulkUploadPoliciesViaApi({
      post,
      readFileAsBase64,
      files: [file('A.pdf'), file('B.pdf')],
      concurrency: 1,
    });

    expect(result.createdCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.results[0]).toEqual({
      fileName: 'A.pdf',
      fileSize: 3,
      status: 'failed',
      error: 'Forbidden',
      httpStatus: 403,
    });
    expect(result.results[1]).toEqual({
      fileName: 'B.pdf',
      fileSize: 3,
      status: 'created',
      policyId: 'pol_2',
    });
    // Failed create (no attach) + create B + attach B = 3 calls total.
    expect(post).toHaveBeenCalledTimes(3);
    // The failed file never triggers a PDF attach.
    expect(post).not.toHaveBeenCalledWith(
      expect.stringContaining('/pdf'),
      expect.objectContaining({ fileName: 'A.pdf' }),
    );
  });

  it('marks the file failed but keeps the created policy id when the PDF attach fails', async () => {
    post
      .mockResolvedValueOnce({ data: { id: 'pol_1' }, status: 201 }) // create
      .mockResolvedValueOnce({ error: 'File too large', status: 400 }); // attach fails

    const result = await bulkUploadPoliciesViaApi({
      post,
      readFileAsBase64,
      files: [file('Big.pdf')],
      concurrency: 1,
    });

    expect(result.createdCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.results[0]).toEqual({
      fileName: 'Big.pdf',
      fileSize: 3,
      status: 'failed',
      policyId: 'pol_1',
      error: 'File too large',
      httpStatus: 400,
    });
  });

  it('fails a file without hitting the API when its bytes cannot be read', async () => {
    readFileAsBase64.mockRejectedValueOnce(new Error('boom'));

    const result = await bulkUploadPoliciesViaApi({
      post,
      readFileAsBase64,
      files: [file('Unreadable.pdf')],
      concurrency: 1,
    });

    expect(result.createdCount).toBe(0);
    expect(result.results[0]).toEqual({
      fileName: 'Unreadable.pdf',
      fileSize: 3,
      status: 'failed',
      error: 'Failed to read Unreadable.pdf',
    });
    // A file that can't be read must never create an (orphan) policy.
    expect(post).not.toHaveBeenCalled();
  });

  it('processes files with bounded concurrency instead of strictly sequentially', async () => {
    let active = 0;
    let maxActive = 0;
    const gates: Array<() => void> = [];
    // Gate each read so we can observe how many files are in flight at once.
    readFileAsBase64.mockImplementation(() => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      return new Promise<string>((resolve) => {
        gates.push(() => {
          active -= 1;
          resolve('ZmFrZQ==');
        });
      });
    });
    post.mockResolvedValue({ data: { id: 'pol' }, status: 201 });

    const files = [
      file('a.pdf'),
      file('b.pdf'),
      file('c.pdf'),
      file('d.pdf'),
    ];
    const promise = bulkUploadPoliciesViaApi({
      post,
      readFileAsBase64,
      files,
      concurrency: 2,
    });

    // Two workers start immediately → two files read concurrently. A strictly
    // sequential implementation would only ever have one in flight.
    await Promise.resolve();
    expect(maxActive).toBe(2);

    // Drain: release reads until the whole batch settles.
    for (let i = 0; i < 200 && (gates.length > 0 || active > 0); i++) {
      gates.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    }

    const result = await promise;
    expect(result.createdCount).toBe(4);
    expect(maxActive).toBe(2); // never exceeded the concurrency bound
  });
});

import { EventEmitter } from 'node:events';

// Mock module boundaries so importing the task does not connect to Postgres,
// the Trigger SDK, S3, or pull in jsPDF. We only exercise streamArchiveToS3 —
// the concurrent populate+upload orchestration and its error propagation.
jest.mock('@db', () => ({ db: { organization: { findUnique: jest.fn() } } }));

jest.mock('@trigger.dev/sdk', () => ({
  metadata: { set: jest.fn(), get: jest.fn() },
  schemaTask: (config: unknown) => config,
}));

const mockUploadDone = jest.fn();
const mockUploadAbort = jest.fn().mockResolvedValue(undefined);
jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation((opts: { params?: { Body?: unknown } }) => {
    // A real Upload consumes the Body stream and surfaces its errors via done().
    // Mimic that so a destroyed PassThrough doesn't become an unhandled error.
    const body = opts?.params?.Body as
      | { on?: (e: string, cb: () => void) => void; resume?: () => void }
      | undefined;
    if (body && typeof body.on === 'function') {
      body.on('error', () => {});
      if (typeof body.resume === 'function') body.resume();
    }
    return { done: mockUploadDone, abort: mockUploadAbort };
  }),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  GetObjectCommand: jest.fn(),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

// Fake archiver: an EventEmitter with the methods streamArchiveToS3 touches.
function makeFakeArchive() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    pipe: jest.fn(),
    finalize: jest.fn().mockResolvedValue(undefined),
    abort: jest.fn(),
    append: jest.fn(),
  });
}
let fakeArchive: ReturnType<typeof makeFakeArchive>;
jest.mock('archiver', () => jest.fn(() => fakeArchive));

// The task module pulls these in at import time; stub them (unused by the SUT).
jest.mock('@/tasks/evidence-export/evidence-data-loader', () => ({
  getAutomationHeaders: jest.fn(),
  streamAutomationRuns: jest.fn(),
  findTasksWithEvidence: jest.fn(),
}));
jest.mock('@/tasks/evidence-export/evidence-pdf-generator', () => ({
  generateAutomationPDFFromStream: jest.fn(),
  generateTaskSummaryPDF: jest.fn(),
  sanitizeFilename: (s: string) => s,
}));
jest.mock('@/tasks/evidence-export/evidence-json-builder', () => ({
  buildAutomationJsonStream: jest.fn(),
}));
jest.mock('@/tasks/evidence-export/evidence-attachment-streamer', () => ({
  getTaskAttachments: jest.fn(),
  appendAttachmentToArchive: jest.fn(),
  createFilenameTracker: jest.fn(),
}));

import { streamArchiveToS3 } from './export-organization-evidence';

describe('streamArchiveToS3', () => {
  const s3Client = {} as never;
  const baseParams = { s3Client, bucket: 'b', key: 'k' };

  beforeEach(() => {
    fakeArchive = makeFakeArchive();
    mockUploadDone.mockReset().mockResolvedValue(undefined);
    mockUploadAbort.mockClear();
  });

  it('finalizes the archive once and resolves on the happy path', async () => {
    const populate = jest.fn().mockResolvedValue(undefined);

    await streamArchiveToS3({ ...baseParams, populate });

    expect(populate).toHaveBeenCalledWith(fakeArchive);
    expect(fakeArchive.finalize).toHaveBeenCalledTimes(1);
    expect(fakeArchive.pipe).toHaveBeenCalledTimes(1);
    expect(mockUploadDone).toHaveBeenCalledTimes(1);
    expect(mockUploadAbort).not.toHaveBeenCalled();
  });

  it('aborts the archive + upload and rethrows when populate fails', async () => {
    const boom = new Error('populate failed');
    const populate = jest.fn().mockRejectedValue(boom);
    // Upload would hang until the stream ends; resolve it so allSettled settles.
    mockUploadDone.mockResolvedValue(undefined);

    await expect(streamArchiveToS3({ ...baseParams, populate })).rejects.toBe(
      boom,
    );

    expect(fakeArchive.abort).toHaveBeenCalledTimes(1);
    expect(fakeArchive.finalize).not.toHaveBeenCalled();
    expect(mockUploadAbort).toHaveBeenCalledTimes(1);
  });

  it('aborts the multipart upload and rethrows when the S3 upload fails', async () => {
    const uploadErr = new Error('s3 upload failed');
    const populate = jest.fn().mockResolvedValue(undefined);
    mockUploadDone.mockRejectedValue(uploadErr);

    await expect(streamArchiveToS3({ ...baseParams, populate })).rejects.toBe(
      uploadErr,
    );

    expect(fakeArchive.finalize).toHaveBeenCalledTimes(1);
    // populate succeeded, so we do not abort the archive itself...
    expect(fakeArchive.abort).not.toHaveBeenCalled();
    // ...but we DO cancel the multipart upload to avoid orphaned S3 parts.
    expect(mockUploadAbort).toHaveBeenCalledTimes(1);
  });
});

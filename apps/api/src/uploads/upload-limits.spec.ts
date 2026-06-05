import { MAX_UPLOAD_BASE64_LENGTH, MAX_UPLOAD_BYTES } from './upload-limits';

describe('upload-limits', () => {
  it('caps decoded uploads at 100 MiB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(100 * 1024 * 1024);
  });

  it('allows the base64 of a full 100 MiB file (no false 413 for UI uploads)', () => {
    // Regression guard: the previous literal (134_217_728) was the base64 length
    // of only 96 MiB, so a 96–100 MiB file the UI/service accept was rejected.
    expect(MAX_UPLOAD_BASE64_LENGTH).toBe(139_810_136);
    expect(MAX_UPLOAD_BASE64_LENGTH).toBe(Math.ceil(MAX_UPLOAD_BYTES / 3) * 4);
    expect(MAX_UPLOAD_BASE64_LENGTH).toBeGreaterThan(134_217_728);
  });
});

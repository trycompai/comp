import { isSafeUrl } from './url-safety.validator';

describe('isSafeUrl', () => {
  it('should allow normal HTTPS URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('https://app.trycomp.ai/dashboard')).toBe(true);
  });

  it('should allow HTTP URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('should block AWS metadata endpoint', () => {
    expect(isSafeUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  it('should block link-local range', () => {
    expect(isSafeUrl('http://169.254.0.1/')).toBe(false);
  });

  it('should block private IP ranges', () => {
    expect(isSafeUrl('http://10.0.0.1/')).toBe(false);
    expect(isSafeUrl('http://172.16.0.1/')).toBe(false);
    expect(isSafeUrl('http://192.168.1.1/')).toBe(false);
  });

  it('should block localhost', () => {
    expect(isSafeUrl('http://localhost/')).toBe(false);
    expect(isSafeUrl('http://127.0.0.1/')).toBe(false);
    expect(isSafeUrl('http://[::1]/')).toBe(false);
  });

  it('should block non-http protocols', () => {
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeUrl('ftp://internal/')).toBe(false);
  });

  it('should reject invalid URLs', () => {
    expect(isSafeUrl('not-a-url')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
  });
});

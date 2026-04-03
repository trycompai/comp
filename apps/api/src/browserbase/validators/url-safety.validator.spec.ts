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

  it('should block IPv4-mapped IPv6 addresses', () => {
    expect(isSafeUrl('http://[::ffff:169.254.169.254]/')).toBe(false);
    expect(isSafeUrl('http://[::ffff:10.0.0.1]/')).toBe(false);
    expect(isSafeUrl('http://[::ffff:127.0.0.1]/')).toBe(false);
    expect(isSafeUrl('http://[::ffff:192.168.1.1]/')).toBe(false);
  });

  it('should block IPv4-mapped IPv6 in hex form', () => {
    // ::ffff:a9fe:a9fe = 169.254.169.254
    expect(isSafeUrl('http://[::ffff:a9fe:a9fe]/')).toBe(false);
    // ::ffff:a00:1 = 10.0.0.1
    expect(isSafeUrl('http://[::ffff:a00:1]/')).toBe(false);
    // ::ffff:7f00:1 = 127.0.0.1
    expect(isSafeUrl('http://[::ffff:7f00:1]/')).toBe(false);
  });

  it('should allow valid IPv6 public addresses', () => {
    expect(isSafeUrl('http://[2607:f8b0:4004:800::200e]/')).toBe(true);
  });
});

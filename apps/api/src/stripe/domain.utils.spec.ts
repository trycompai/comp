import { extractDomain, isPublicEmailDomain } from './domain.utils';

describe('extractDomain', () => {
  it('returns null for empty input', () => {
    expect(extractDomain(null)).toBeNull();
    expect(extractDomain(undefined)).toBeNull();
    expect(extractDomain('')).toBeNull();
  });

  it('extracts domain from email', () => {
    expect(extractDomain('user@acme.com')).toBe('acme.com');
    expect(extractDomain('USER@ACME.COM')).toBe('acme.com');
  });

  it('extracts hostname from a URL and strips www.', () => {
    expect(extractDomain('https://www.acme.com/foo')).toBe('acme.com');
    expect(extractDomain('http://acme.com')).toBe('acme.com');
  });

  it('adds protocol when missing', () => {
    expect(extractDomain('acme.com')).toBe('acme.com');
    expect(extractDomain('www.acme.com/path')).toBe('acme.com');
  });

  it('returns null on garbage input', () => {
    expect(extractDomain('   ')).toBeNull();
  });
});

describe('isPublicEmailDomain', () => {
  it('flags common free providers', () => {
    expect(isPublicEmailDomain('gmail.com')).toBe(true);
    expect(isPublicEmailDomain('outlook.com')).toBe(true);
    expect(isPublicEmailDomain('icloud.com')).toBe(true);
  });

  it('is case- and trailing-dot-insensitive', () => {
    expect(isPublicEmailDomain('GMAIL.COM')).toBe(true);
    expect(isPublicEmailDomain('gmail.com.')).toBe(true);
  });

  it('returns false for a real company domain', () => {
    expect(isPublicEmailDomain('acme.com')).toBe(false);
    expect(isPublicEmailDomain('trycomp.ai')).toBe(false);
  });
});

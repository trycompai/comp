import { describe, expect, it } from 'vitest';
import { cleanDomainInput, isValidDomain } from './OnboardingStepInput';

describe('cleanDomainInput', () => {
  it('strips a trailing slash', () => {
    expect(cleanDomainInput('example.com/')).toBe('example.com');
  });

  it('strips multiple trailing slashes', () => {
    expect(cleanDomainInput('example.com//')).toBe('example.com');
  });

  it('strips the https:// protocol', () => {
    expect(cleanDomainInput('https://example.com')).toBe('example.com');
  });

  it('strips the http:// protocol', () => {
    expect(cleanDomainInput('http://example.com')).toBe('example.com');
  });

  it('strips a www. prefix', () => {
    expect(cleanDomainInput('www.example.com')).toBe('example.com');
  });

  it('strips protocol, www, and a trailing slash together', () => {
    expect(cleanDomainInput('https://www.example.com/')).toBe('example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(cleanDomainInput('  example.com  ')).toBe('example.com');
  });

  it('leaves an already-clean domain unchanged', () => {
    expect(cleanDomainInput('example.com')).toBe('example.com');
  });
});

describe('isValidDomain', () => {
  it('accepts an empty string (optional field)', () => {
    expect(isValidDomain('')).toBe(true);
  });

  it('accepts a plain domain', () => {
    expect(isValidDomain('example.com')).toBe(true);
  });

  it('accepts a domain with a trailing slash', () => {
    expect(isValidDomain('example.com/')).toBe(true);
  });

  it('accepts a domain with protocol, www, and a trailing slash', () => {
    expect(isValidDomain('https://www.example.com/')).toBe(true);
  });

  it('accepts a subdomain', () => {
    expect(isValidDomain('sub.example.com')).toBe(true);
  });

  it('rejects a value with no dot', () => {
    expect(isValidDomain('example')).toBe(false);
  });

  it('rejects a value with a path', () => {
    expect(isValidDomain('example.com/about')).toBe(false);
  });

  it('rejects a value with spaces', () => {
    expect(isValidDomain('exa mple.com')).toBe(false);
  });
});

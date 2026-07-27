import { describe, expect, it } from 'vitest';
import { normalizeUrl, stripScheme } from './connect-url';

describe('normalizeUrl', () => {
  it('adds https:// to a bare domain', () => {
    expect(normalizeUrl('notion.so')).toBe('https://notion.so');
  });

  it('keeps an existing https:// URL', () => {
    expect(normalizeUrl('https://app.notion.so/login')).toBe(
      'https://app.notion.so/login',
    );
  });

  it('keeps an existing http:// URL', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeUrl('  notion.so  ')).toBe('https://notion.so');
  });

  it('returns empty for empty input', () => {
    expect(normalizeUrl('   ')).toBe('');
  });
});

describe('stripScheme', () => {
  it('removes a pasted https:// so the static prefix is not doubled', () => {
    expect(stripScheme('https://notion.so')).toBe('notion.so');
  });

  it('removes a pasted http://', () => {
    expect(stripScheme('http://example.com/login')).toBe('example.com/login');
  });

  it('leaves a bare domain untouched', () => {
    expect(stripScheme('app.notion.so')).toBe('app.notion.so');
  });

  it('is case-insensitive about the scheme', () => {
    expect(stripScheme('HTTPS://notion.so')).toBe('notion.so');
  });
});

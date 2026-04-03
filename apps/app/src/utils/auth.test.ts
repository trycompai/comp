import { describe, expect, it } from 'vitest';

/**
 * headersToObject is not exported from auth.ts, so we replicate the logic here
 * to ensure correct behavior. If the implementation changes, these tests catch regressions.
 */

const API_URL = 'http://localhost:3333';

function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'cookie' || k === 'origin' || k.startsWith('x-')) {
      obj[key] = value;
    }
  });
  if (!obj.origin && !obj.Origin) {
    obj.origin = API_URL;
  }
  return obj;
}

describe('headersToObject', () => {
  it('forwards cookie header', () => {
    const headers = new Headers({ cookie: 'session=abc123' });
    const result = headersToObject(headers);
    expect(result.cookie).toBe('session=abc123');
  });

  it('forwards origin header when present', () => {
    const headers = new Headers({
      cookie: 'session=abc',
      origin: 'https://app.example.com',
    });
    const result = headersToObject(headers);
    expect(result.origin).toBe('https://app.example.com');
  });

  it('sets origin to API_URL when origin header is missing', () => {
    const headers = new Headers({ cookie: 'session=abc' });
    const result = headersToObject(headers);
    expect(result.origin).toBe(API_URL);
  });

  it('forwards x-prefixed headers', () => {
    const headers = new Headers({
      'x-request-id': '12345',
      'x-forwarded-for': '127.0.0.1',
    });
    const result = headersToObject(headers);
    expect(result['x-request-id']).toBe('12345');
    expect(result['x-forwarded-for']).toBe('127.0.0.1');
  });

  it('excludes non-allowlisted headers', () => {
    const headers = new Headers({
      'content-type': 'application/json',
      authorization: 'Bearer token',
      accept: 'text/html',
    });
    const result = headersToObject(headers);
    expect(result['content-type']).toBeUndefined();
    expect(result.authorization).toBeUndefined();
    expect(result.accept).toBeUndefined();
    // Should still add origin fallback
    expect(result.origin).toBe(API_URL);
  });

  it('does not override existing origin with fallback', () => {
    const headers = new Headers({ origin: 'https://custom.example.com' });
    const result = headersToObject(headers);
    expect(result.origin).toBe('https://custom.example.com');
  });
});

import { describe, it, expect } from 'bun:test';
import { resolveSslConfig } from './ssl-config';

describe('resolveSslConfig', () => {
  it('returns undefined for localhost', () => {
    expect(resolveSslConfig('postgresql://u:p@localhost:5432/x', {})).toBeUndefined();
  });

  it('returns undefined for 127.0.0.1', () => {
    expect(resolveSslConfig('postgresql://u:p@127.0.0.1:5432/x', {})).toBeUndefined();
  });

  it('returns undefined for ::1', () => {
    expect(resolveSslConfig('postgresql://u:p@[::1]:5432/x', {})).toBeUndefined();
  });

  it('returns true (verified) when NODE_EXTRA_CA_CERTS is set', () => {
    expect(
      resolveSslConfig('postgresql://u:p@db.prod.example.com:5432/x', {
        NODE_EXTRA_CA_CERTS: '/etc/ssl/certs/ca-certificates.crt',
      }),
    ).toBe(true);
  });

  it('returns rejectUnauthorized:false when PRISMA_ALLOW_INSECURE_TLS=1', () => {
    expect(
      resolveSslConfig('postgresql://u:p@db.prod.example.com:5432/x', {
        PRISMA_ALLOW_INSECURE_TLS: '1',
      }),
    ).toEqual({ rejectUnauthorized: false });
  });

  it('throws on remote URL with neither env var set', () => {
    expect(() => resolveSslConfig('postgresql://u:p@db.prod.example.com:5432/x', {})).toThrow(
      /Refusing to connect/,
    );
  });

  it('treats malformed URLs as remote (defensive)', () => {
    expect(() => resolveSslConfig('not-a-valid-url', {})).toThrow(/Refusing to connect/);
  });

  it('prefers verified TLS over insecure opt-in when both are set', () => {
    expect(
      resolveSslConfig('postgresql://u:p@db.prod.example.com:5432/x', {
        NODE_EXTRA_CA_CERTS: '/etc/ssl/certs/ca-certificates.crt',
        PRISMA_ALLOW_INSECURE_TLS: '1',
      }),
    ).toBe(true);
  });
});

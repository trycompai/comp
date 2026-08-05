import { describe, it, expect, afterEach } from 'vitest';
import { resolveSslConfig } from './ssl-config';
import { resolveConnectionString } from './client';

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

  it('returns rejectUnauthorized:false when PRISMA_ALLOW_INSECURE_TLS=1', () => {
    expect(
      resolveSslConfig('postgresql://u:p@db.prod.example.com:5432/x', {
        PRISMA_ALLOW_INSECURE_TLS: '1',
      }),
    ).toEqual({ rejectUnauthorized: false });
  });

  it('returns checkServerIdentity-noop for remote URLs (verified TLS via Node defaults)', () => {
    const result = resolveSslConfig('postgresql://u:p@db.prod.example.com:5432/x', {});
    expect(result).toBeDefined();
    expect(typeof (result as { checkServerIdentity: unknown }).checkServerIdentity).toBe('function');
    expect((result as { checkServerIdentity: () => undefined }).checkServerIdentity()).toBeUndefined();
  });

  it('treats malformed URLs as remote (defensive)', () => {
    const result = resolveSslConfig('not-a-valid-url', {});
    expect(result).toBeDefined();
    expect(typeof (result as { checkServerIdentity: () => undefined }).checkServerIdentity).toBe('function');
  });
});

describe('resolveConnectionString', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns the dedicated RLS URL when set', () => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgres://owner@db/main',
      DATABASE_URL_TENANT: 'postgres://comp_app@db/main',
    };
    expect(resolveConnectionString('DATABASE_URL_TENANT')).toBe(
      'postgres://comp_app@db/main',
    );
  });

  it('falls back to DATABASE_URL when the dedicated URL is unset', () => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgres://owner@db/main',
      DATABASE_URL_TENANT: undefined,
    };
    expect(resolveConnectionString('DATABASE_URL_TENANT')).toBe(
      'postgres://owner@db/main',
    );
  });
});

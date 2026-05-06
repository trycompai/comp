import { describe, it, expect } from 'bun:test';
import { resolveSslConfig, rdsServerIdentity } from './ssl-config';
import type { PeerCertificate } from 'node:tls';

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

  it('returns combined-CA + custom rdsServerIdentity for remote URLs', () => {
    const result = resolveSslConfig('postgresql://u:p@db.prod.example.com:5432/x', {});
    expect(result).toBeDefined();
    if (!result || !('ca' in result)) throw new Error('expected ca branch');
    expect(Array.isArray(result.ca)).toBe(true);
    // Combined trust includes our pinned RDS bundle plus Node's defaults.
    expect((result.ca as string[]).length).toBeGreaterThan(1);
    expect(typeof result.checkServerIdentity).toBe('function');
  });

  it('returns rejectUnauthorized:false when PRISMA_ALLOW_INSECURE_TLS=1', () => {
    expect(
      resolveSslConfig('postgresql://u:p@db.prod.example.com:5432/x', {
        PRISMA_ALLOW_INSECURE_TLS: '1',
      }),
    ).toEqual({ rejectUnauthorized: false });
  });

  it('treats malformed URLs as remote (defensive)', () => {
    const result = resolveSslConfig('not-a-valid-url', {});
    expect(result).toBeDefined();
    expect((result as { ca: unknown }).ca).toBeDefined();
  });
});

describe('rdsServerIdentity', () => {
  const make = (cn: string, sans: string[] = []): PeerCertificate =>
    ({
      subject: { CN: cn },
      subjectaltname: sans.map((s) => `DNS:${s}`).join(', '),
    }) as unknown as PeerCertificate;

  it('accepts a cert whose CN is an RDS endpoint', () => {
    const cert = make('my-proxy.proxy-abc.us-east-1.rds.amazonaws.com');
    expect(rdsServerIdentity('any-host.example.com', cert)).toBeUndefined();
  });

  it('accepts a cert whose SAN includes an RDS endpoint', () => {
    const cert = make('something.example.com', [
      'my-proxy.proxy-abc.us-east-1.rds.amazonaws.com',
    ]);
    expect(rdsServerIdentity('any-host.example.com', cert)).toBeUndefined();
  });

  it('accepts the .cn region suffix', () => {
    const cert = make('proxy.proxy-abc.cn-north-1.rds.amazonaws.com.cn');
    expect(rdsServerIdentity('any-host.example.com', cert)).toBeUndefined();
  });

  it('rejects a cert that is not for an RDS endpoint', () => {
    const cert = make('attacker.example.com', ['evil.example.com']);
    const err = rdsServerIdentity('any-host.example.com', cert);
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toMatch(/not for an AWS RDS endpoint/);
  });

  it('rejects when CN/SAN are empty', () => {
    const cert = make('', []);
    expect(rdsServerIdentity('any-host.example.com', cert)).toBeInstanceOf(Error);
  });
});

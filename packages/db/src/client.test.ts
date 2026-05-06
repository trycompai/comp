import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NODE_EXTRA_CA_CERTS;
  delete process.env.PRISMA_ALLOW_INSECURE_TLS;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('Prisma client TLS gating', () => {
  it('throws on remote URL with no opt-in', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@db.prod.example.com:5432/x';
    await expect(import('./client')).rejects.toThrow(/Refusing to connect/);
  });

  it('does not throw on localhost URL', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/x';
    await expect(import('./client')).resolves.toBeDefined();
  });

  it('does not throw on 127.0.0.1', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:5432/x';
    await expect(import('./client')).resolves.toBeDefined();
  });

  it('does not throw on remote URL with PRISMA_ALLOW_INSECURE_TLS=1', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@db.prod.example.com:5432/x';
    process.env.PRISMA_ALLOW_INSECURE_TLS = '1';
    await expect(import('./client')).resolves.toBeDefined();
  });

  it('does not throw on remote URL with NODE_EXTRA_CA_CERTS set', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@db.prod.example.com:5432/x';
    process.env.NODE_EXTRA_CA_CERTS = '/etc/ssl/certs/ca-certificates.crt';
    await expect(import('./client')).resolves.toBeDefined();
  });
});

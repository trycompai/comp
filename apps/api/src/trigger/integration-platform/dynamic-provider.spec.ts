// Mock @db so importing the helper doesn't open a Postgres connection.
const findUnique = jest.fn();
jest.mock('@db', () => ({
  db: { dynamicIntegration: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

import { isActiveDynamicProvider, shouldRunOnServer } from './dynamic-provider';

describe('shouldRunOnServer', () => {
  it('always delegates AWS (VPC egress), with or without a manifest', () => {
    expect(
      shouldRunOnServer({ providerSlug: 'aws', hasManifest: true, isActiveDynamic: false }),
    ).toBe(true);
    expect(
      shouldRunOnServer({ providerSlug: 'aws', hasManifest: false, isActiveDynamic: false }),
    ).toBe(true);
  });

  it('runs static providers (manifest present) in-process', () => {
    expect(
      shouldRunOnServer({ providerSlug: 'github', hasManifest: true, isActiveDynamic: false }),
    ).toBe(false);
    // Even if a dynamic row somehow also exists, a present manifest wins (static).
    expect(
      shouldRunOnServer({ providerSlug: 'vercel', hasManifest: true, isActiveDynamic: true }),
    ).toBe(false);
  });

  it('delegates active dynamic providers (no local manifest) to the server', () => {
    expect(
      shouldRunOnServer({ providerSlug: 'keeper-security', hasManifest: false, isActiveDynamic: true }),
    ).toBe(true);
    expect(
      shouldRunOnServer({ providerSlug: 'supabase', hasManifest: false, isActiveDynamic: true }),
    ).toBe(true);
  });

  it('does NOT delegate an unknown provider (no manifest, not dynamic)', () => {
    expect(
      shouldRunOnServer({ providerSlug: 'deleted-thing', hasManifest: false, isActiveDynamic: false }),
    ).toBe(false);
  });
});

describe('isActiveDynamicProvider', () => {
  beforeEach(() => findUnique.mockReset());

  it('is true only for an active dynamic integration row', async () => {
    findUnique.mockResolvedValue({ isActive: true });
    await expect(isActiveDynamicProvider('keeper-security')).resolves.toBe(true);
  });

  it('is false for an inactive dynamic integration', async () => {
    findUnique.mockResolvedValue({ isActive: false });
    await expect(isActiveDynamicProvider('paused-thing')).resolves.toBe(false);
  });

  it('is false when no dynamic row exists (static or unknown slug)', async () => {
    findUnique.mockResolvedValue(null);
    await expect(isActiveDynamicProvider('github')).resolves.toBe(false);
  });
});

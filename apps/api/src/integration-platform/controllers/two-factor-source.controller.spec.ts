import { HttpException } from '@nestjs/common';

jest.mock('@db', () => ({
  db: {
    organization: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

// Break the ESM better-auth import chain pulled in via HybridAuthGuard.
jest.mock('@trycompai/auth', () => ({
  statement: { integration: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));
jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

import { db } from '@db';
import { TwoFactorSourceController } from './two-factor-source.controller';

const mockOrgFindUnique = (
  db.organization as unknown as { findUnique: jest.Mock }
).findUnique;
const mockOrgUpdate = (db.organization as unknown as { update: jest.Mock })
  .update;

const mockCheckResults = {
  listSourcesBoundToTask: jest.fn(),
  getLatestResultsForTask: jest.fn(),
};

function makeController() {
  return new TwoFactorSourceController(mockCheckResults as never);
}

function source(slug: string, connected: boolean, name = slug) {
  return {
    slug,
    name,
    logoUrl: null,
    checkId: 'two-factor-auth',
    connected,
    connectionId: connected ? `conn_${slug}` : null,
    lastSyncAt: null,
    nextSyncAt: null,
  };
}

const ORG = 'org_1';

beforeEach(() => {
  jest.clearAllMocks();
  // Default: the org exists (individual tests override to simulate a stale/
  // deleted org context).
  mockOrgFindUnique.mockResolvedValue({ id: ORG, twoFactorSource: null });
});

describe('TwoFactorSourceController.getTwoFactorSource', () => {
  it('returns the configured provider', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: 'google-workspace' });
    expect(await makeController().getTwoFactorSource(ORG)).toEqual({
      provider: 'google-workspace',
    });
  });

  it('throws when the org does not exist', async () => {
    mockOrgFindUnique.mockResolvedValue(null);
    await expect(makeController().getTwoFactorSource(ORG)).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});

describe('TwoFactorSourceController.setTwoFactorSource', () => {
  it('rejects a blank/whitespace provider with 400', async () => {
    await expect(
      makeController().setTwoFactorSource(ORG, { provider: '   ' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it('rejects a provider not bound to the 2FA task', async () => {
    mockCheckResults.listSourcesBoundToTask.mockResolvedValue([
      source('google-workspace', true),
    ]);
    await expect(
      makeController().setTwoFactorSource(ORG, { provider: 'slack' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it('rejects a bound provider that is not connected', async () => {
    mockCheckResults.listSourcesBoundToTask.mockResolvedValue([
      source('google-workspace', false),
    ]);
    await expect(
      makeController().setTwoFactorSource(ORG, { provider: 'google-workspace' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it('sets a valid, connected, bound provider', async () => {
    mockCheckResults.listSourcesBoundToTask.mockResolvedValue([
      source('google-workspace', true),
    ]);
    mockOrgUpdate.mockResolvedValue({});

    const result = await makeController().setTwoFactorSource(ORG, {
      provider: 'google-workspace',
    });

    expect(result).toEqual({ success: true, provider: 'google-workspace' });
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: ORG },
      data: { twoFactorSource: 'google-workspace' },
    });
  });

  it('clears the source when provider is null', async () => {
    mockOrgUpdate.mockResolvedValue({});
    const result = await makeController().setTwoFactorSource(ORG, {
      provider: null,
    });
    expect(result).toEqual({ success: true, provider: null });
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: ORG },
      data: { twoFactorSource: null },
    });
  });

  it('returns 404 (not 400 "not connected") when setting a provider for a missing org', async () => {
    mockOrgFindUnique.mockResolvedValue(null);
    // Even with sources resolvable, the missing org must win with a 404 —
    // a dead org's empty connection list must not surface as a 400.
    mockCheckResults.listSourcesBoundToTask.mockResolvedValue([
      source('google-workspace', false),
    ]);

    await expect(
      makeController().setTwoFactorSource(ORG, { provider: 'google-workspace' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it('maps a missing org row (P2025) to 404 instead of a 500', async () => {
    mockOrgUpdate.mockRejectedValue(
      Object.assign(new Error('No record found'), { code: 'P2025' }),
    );

    await expect(
      makeController().setTwoFactorSource(ORG, { provider: null }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rethrows non-P2025 update errors untouched', async () => {
    const dbError = new Error('connection lost');
    mockOrgUpdate.mockRejectedValue(dbError);

    await expect(
      makeController().setTwoFactorSource(ORG, { provider: null }),
    ).rejects.toBe(dbError);
  });
});

describe('TwoFactorSourceController.getAvailableTwoFactorSources', () => {
  it('returns bound sources with connection state (without the internal checkId)', async () => {
    mockCheckResults.listSourcesBoundToTask.mockResolvedValue([
      source('google-workspace', true, 'Google Workspace'),
      source('github', false, 'GitHub'),
    ]);

    const { providers } = await makeController().getAvailableTwoFactorSources(ORG);

    expect(providers.map((p) => p.slug)).toEqual(['google-workspace', 'github']);
    expect(providers[0]).not.toHaveProperty('checkId');
    expect(providers[0].connected).toBe(true);
  });
});

describe('TwoFactorSourceController.getTwoFactorStatuses', () => {
  it('returns unconfigured when no source is set', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: null });
    expect(await makeController().getTwoFactorStatuses(ORG)).toEqual({
      configured: false,
      source: null,
      statuses: [],
    });
    expect(mockCheckResults.getLatestResultsForTask).not.toHaveBeenCalled();
  });

  it('404s on a missing org instead of reporting unconfigured', async () => {
    mockOrgFindUnique.mockResolvedValue(null);
    await expect(
      makeController().getTwoFactorStatuses(ORG),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('maps the service results to lowercased email + enabled/missing', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: 'google-workspace' });
    mockCheckResults.getLatestResultsForTask.mockResolvedValue([
      { resourceId: 'Alice@X.com', passed: true },
      { resourceId: 'bob@x.com', passed: false },
    ]);

    const result = await makeController().getTwoFactorStatuses(ORG);

    expect(mockCheckResults.getLatestResultsForTask).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG,
        sourceSlug: 'google-workspace',
        resourceType: 'user',
      }),
    );
    expect(result).toEqual({
      configured: true,
      source: 'google-workspace',
      statuses: [
        { email: 'alice@x.com', status: 'enabled' },
        { email: 'bob@x.com', status: 'missing' },
      ],
    });
  });

  it('resolves conflicting rows for one email deterministically — a fail always wins', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: 'google-workspace' });
    mockCheckResults.listSourcesBoundToTask.mockResolvedValue([
      source('google-workspace', true),
    ]);

    // Same email with pass+fail rows, in BOTH orders — result must not depend
    // on iteration order.
    for (const rows of [
      [
        { resourceId: 'dup@x.com', passed: true },
        { resourceId: 'dup@x.com', passed: false },
      ],
      [
        { resourceId: 'dup@x.com', passed: false },
        { resourceId: 'dup@x.com', passed: true },
      ],
    ]) {
      mockCheckResults.getLatestResultsForTask.mockResolvedValue(rows);
      const result = await makeController().getTwoFactorStatuses(ORG);
      expect(result.statuses).toEqual([
        { email: 'dup@x.com', status: 'missing' },
      ]);
    }
  });

  it('returns empty statuses when the source has no results', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: 'google-workspace' });
    mockCheckResults.getLatestResultsForTask.mockResolvedValue([]);

    expect(await makeController().getTwoFactorStatuses(ORG)).toEqual({
      configured: true,
      source: 'google-workspace',
      statuses: [],
    });
  });
});

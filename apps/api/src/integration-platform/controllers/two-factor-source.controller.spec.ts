import { HttpException } from '@nestjs/common';

jest.mock('@db', () => ({
  db: {
    organization: { findUnique: jest.fn(), update: jest.fn() },
    integrationConnection: { findFirst: jest.fn() },
  },
}));

jest.mock('@trycompai/integration-platform', () => {
  const actual = jest.requireActual<
    typeof import('@trycompai/integration-platform')
  >('@trycompai/integration-platform');
  return {
    ...actual,
    registry: { getActiveManifests: jest.fn() },
  };
});

// Break the ESM better-auth import chain pulled in via HybridAuthGuard.
jest.mock('@trycompai/auth', () => ({
  statement: { integration: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));
jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

import { db } from '@db';
import { registry, TASK_TEMPLATES } from '@trycompai/integration-platform';
import { TwoFactorSourceController } from './two-factor-source.controller';

const mockGetActiveManifests = (
  registry as unknown as { getActiveManifests: jest.Mock }
).getActiveManifests;
const mockOrgFindUnique = (
  db.organization as unknown as { findUnique: jest.Mock }
).findUnique;
const mockOrgUpdate = (db.organization as unknown as { update: jest.Mock })
  .update;
const mockConnFindFirst = (
  db.integrationConnection as unknown as { findFirst: jest.Mock }
).findFirst;

// Build a manifest whose check is bound to the 2FA task.
function boundManifest(id: string, name = id) {
  return {
    id,
    name,
    logoUrl: null,
    checks: [{ id: 'two-factor-auth', taskMapping: TASK_TEMPLATES.twoFactorAuth }],
  };
}
// A manifest with a check NOT bound to the 2FA task.
function unboundManifest(id: string) {
  return {
    id,
    name: id,
    logoUrl: null,
    checks: [{ id: 'other', taskMapping: TASK_TEMPLATES.codeChanges }],
  };
}

const mockConnRepo = { findBySlugAndOrg: jest.fn() };
const mockCheckRunRepo = { findLatestUserResultsByConnectionAndCheck: jest.fn() };

function makeController() {
  return new TwoFactorSourceController(
    mockConnRepo as never,
    mockCheckRunRepo as never,
  );
}

const ORG = 'org_1';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TwoFactorSourceController.getTwoFactorSource', () => {
  it('returns the configured provider', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: 'google-workspace' });
    const result = await makeController().getTwoFactorSource(ORG);
    expect(result).toEqual({ provider: 'google-workspace' });
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
    mockGetActiveManifests.mockReturnValue([boundManifest('google-workspace')]);
    await expect(
      makeController().setTwoFactorSource(ORG, { provider: 'slack' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it('rejects a bound provider that is not connected', async () => {
    mockGetActiveManifests.mockReturnValue([boundManifest('google-workspace')]);
    mockConnRepo.findBySlugAndOrg.mockResolvedValue(null);
    await expect(
      makeController().setTwoFactorSource(ORG, { provider: 'google-workspace' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it('sets a valid, connected, bound provider', async () => {
    mockGetActiveManifests.mockReturnValue([boundManifest('google-workspace')]);
    mockConnRepo.findBySlugAndOrg.mockResolvedValue({
      id: 'conn_1',
      status: 'active',
    });
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
});

describe('TwoFactorSourceController.getAvailableTwoFactorSources', () => {
  it('returns only manifests bound to the 2FA task, with connection state', async () => {
    mockGetActiveManifests.mockReturnValue([
      boundManifest('google-workspace', 'Google Workspace'),
      unboundManifest('slack'),
      boundManifest('github', 'GitHub'),
    ]);
    mockConnFindFirst.mockImplementation(
      (args: { where: { provider: { slug: string } } }) =>
        args.where.provider.slug === 'google-workspace'
          ? Promise.resolve({ id: 'conn_1', lastSyncAt: null, nextSyncAt: null })
          : Promise.resolve(null),
    );

    const { providers } = await makeController().getAvailableTwoFactorSources(ORG);

    expect(providers.map((p) => p.slug)).toEqual(['google-workspace', 'github']);
    expect(providers.find((p) => p.slug === 'google-workspace')?.connected).toBe(
      true,
    );
    expect(providers.find((p) => p.slug === 'github')?.connected).toBe(false);
  });
});

describe('TwoFactorSourceController.getTwoFactorStatuses', () => {
  it('returns unconfigured when no source is set', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: null });
    const result = await makeController().getTwoFactorStatuses(ORG);
    expect(result).toEqual({ configured: false, source: null, statuses: [] });
  });

  it('maps latest-run results to lowercased email + enabled/missing', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: 'google-workspace' });
    mockGetActiveManifests.mockReturnValue([boundManifest('google-workspace')]);
    mockConnRepo.findBySlugAndOrg.mockResolvedValue({
      id: 'conn_1',
      status: 'active',
    });
    mockCheckRunRepo.findLatestUserResultsByConnectionAndCheck.mockResolvedValue({
      run: { id: 'run_1' },
      results: [
        { resourceId: 'Alice@X.com', passed: true },
        { resourceId: 'bob@x.com', passed: false },
      ],
    });

    const result = await makeController().getTwoFactorStatuses(ORG);

    expect(
      mockCheckRunRepo.findLatestUserResultsByConnectionAndCheck,
    ).toHaveBeenCalledWith({
      connectionId: 'conn_1',
      checkId: 'two-factor-auth',
      organizationId: ORG,
    });
    expect(result).toEqual({
      configured: true,
      source: 'google-workspace',
      statuses: [
        { email: 'alice@x.com', status: 'enabled' },
        { email: 'bob@x.com', status: 'missing' },
      ],
    });
  });

  it('returns empty statuses when the source has no real run', async () => {
    mockOrgFindUnique.mockResolvedValue({ twoFactorSource: 'google-workspace' });
    mockGetActiveManifests.mockReturnValue([boundManifest('google-workspace')]);
    mockConnRepo.findBySlugAndOrg.mockResolvedValue({
      id: 'conn_1',
      status: 'active',
    });
    mockCheckRunRepo.findLatestUserResultsByConnectionAndCheck.mockResolvedValue(
      null,
    );

    const result = await makeController().getTwoFactorStatuses(ORG);
    expect(result).toEqual({
      configured: true,
      source: 'google-workspace',
      statuses: [],
    });
  });
});

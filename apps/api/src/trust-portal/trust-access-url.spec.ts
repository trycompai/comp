import {
  buildTrustPortalAccessUrl,
  buildTrustPortalBaseUrl,
  ensureTrustFriendlyUrl,
} from './trust-access-url';

jest.mock('@db', () => ({
  db: {
    trust: { findUnique: jest.fn(), upsert: jest.fn() },
  },
  Prisma: {},
}));
const mockDb = jest.requireMock<{
  db: { trust: { findUnique: jest.Mock; upsert: jest.Mock } };
}>('@db').db;

describe('Trust access URL publication safety', () => {
  const oldUrl = process.env.TRUST_APP_URL;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.TRUST_APP_URL = 'https://trust.example.com/';
  });
  afterAll(() => {
    if (oldUrl === undefined) delete process.env.TRUST_APP_URL;
    else process.env.TRUST_APP_URL = oldUrl;
  });

  it('explicitly creates missing Trust as draft despite the database published default', async () => {
    mockDb.trust.findUnique.mockResolvedValue(null);
    await expect(ensureTrustFriendlyUrl('org_local')).resolves.toBe(
      'org_local',
    );
    expect(mockDb.trust.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'org_local' },
      update: { friendlyUrl: 'org_local' },
      create: {
        organizationId: 'org_local',
        friendlyUrl: 'org_local',
        status: 'draft',
      },
    });
  });

  it('does not update an existing portal with a friendly URL', async () => {
    mockDb.trust.findUnique.mockResolvedValue({ friendlyUrl: 'acme' });
    await expect(buildTrustPortalBaseUrl('org_local')).resolves.toBe(
      'https://trust.example.com/acme',
    );
    expect(mockDb.trust.upsert).not.toHaveBeenCalled();
  });

  it('uses only verified custom domains and encodes the reclaim query', async () => {
    mockDb.trust.findUnique.mockResolvedValue({
      domain: 'https://Security.Example.com/path',
      domainVerified: true,
    });
    await expect(
      buildTrustPortalAccessUrl({
        organizationId: 'org_local',
        accessToken: 'secret',
        query: 'section&other=value',
      }),
    ).resolves.toBe(
      'https://security.example.com/access/secret?query=section%26other%3Dvalue',
    );
    expect(mockDb.trust.upsert).not.toHaveBeenCalled();
  });
});

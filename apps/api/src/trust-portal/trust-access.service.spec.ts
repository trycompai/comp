import { GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@db';
import { getSignedUrl } from '../app/s3';
import { TrustAccessService } from './trust-access.service';

jest.mock('@db', () => ({
  db: {
    trust: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    trustNDAAgreement: {
      findUnique: jest.fn(),
    },
    trustAccessGrant: {
      findUnique: jest.fn(),
    },
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(code: string) {
        super();
        this.code = code;
      }
    },
  },
  TrustFramework: {
    iso_27001: 'iso_27001',
    iso_42001: 'iso_42001',
    gdpr: 'gdpr',
    hipaa: 'hipaa',
    soc2_type1: 'soc2_type1',
    soc2_type2: 'soc2_type2',
    pci_dss: 'pci_dss',
    nen_7510: 'nen_7510',
    iso_9001: 'iso_9001',
  },
}));

jest.mock('../app/s3', () => ({
  APP_AWS_ORG_ASSETS_BUCKET: 'org-assets',
  s3Client: { send: jest.fn() },
  getSignedUrl: jest.fn(),
}));

const mockDb = db as unknown as {
  trust: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
  trustNDAAgreement: {
    findUnique: jest.Mock;
  };
  trustAccessGrant: {
    findUnique: jest.Mock;
  };
};

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<
  typeof getSignedUrl
>;

describe('TrustAccessService favicon branding', () => {
  const service = new TrustAccessService(
    {
      getSignedUrl: jest.fn(),
    } as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to organizationId lookup when getPublicFavicon route id is not a friendlyUrl', async () => {
    mockDb.trust.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      favicon: 'org_123/trust/favicon/icon.png',
    });
    mockGetSignedUrl.mockResolvedValue('https://cdn.example.com/favicon.png');

    const result = await service.getPublicFavicon('org_123');

    expect(mockDb.trust.findUnique).toHaveBeenNthCalledWith(1, {
      where: { friendlyUrl: 'org_123' },
      select: { favicon: true },
    });
    expect(mockDb.trust.findUnique).toHaveBeenNthCalledWith(2, {
      where: { organizationId: 'org_123' },
      select: { favicon: true },
    });
    expect(result).toBe('https://cdn.example.com/favicon.png');
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    expect(mockGetSignedUrl.mock.calls[0][1]).toBeInstanceOf(GetObjectCommand);
  });

  it('includes friendlyUrl and faviconUrl in getGrantByAccessToken response', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);

    mockDb.trustAccessGrant.findUnique.mockResolvedValue({
      id: 'grant_1',
      status: 'active',
      expiresAt: futureDate,
      accessTokenExpiresAt: futureDate,
      subjectEmail: 'alice@example.com',
      accessRequest: {
        organizationId: 'org_123',
        name: 'Alice',
        organization: {
          name: 'Acme Security',
        },
      },
      ndaAgreement: null,
    });
    mockDb.trust.findUnique.mockResolvedValue({
      friendlyUrl: 'acme-security',
      favicon: 'org_123/trust/favicon/icon.png',
    });
    mockGetSignedUrl.mockResolvedValue('https://cdn.example.com/favicon.png');

    const result = await service.getGrantByAccessToken('grant-token');

    expect(result).toMatchObject({
      organizationName: 'Acme Security',
      friendlyUrl: 'acme-security',
      faviconUrl: 'https://cdn.example.com/favicon.png',
      subjectEmail: 'alice@example.com',
    });
  });

  it('includes friendlyUrl and faviconUrl in getNdaByToken response', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);

    mockDb.trustNDAAgreement.findUnique.mockResolvedValue({
      id: 'nda_1',
      organizationId: 'org_123',
      signTokenExpiresAt: futureDate,
      status: 'pending',
      accessRequest: {
        name: 'Alice',
        email: 'alice@example.com',
        organization: {
          name: 'Acme Security',
        },
      },
      grant: null,
    });
    mockDb.trust.findUnique
      .mockResolvedValueOnce({
        domain: null,
        domainVerified: false,
        friendlyUrl: 'acme-security',
      })
      .mockResolvedValueOnce({
        friendlyUrl: 'acme-security',
        favicon: 'org_123/trust/favicon/icon.png',
      });
    mockGetSignedUrl.mockResolvedValue('https://cdn.example.com/favicon.png');

    const result = await service.getNdaByToken('nda-token');

    expect(result).toMatchObject({
      id: 'nda_1',
      status: 'pending',
      organizationName: 'Acme Security',
      friendlyUrl: 'acme-security',
      faviconUrl: 'https://cdn.example.com/favicon.png',
    });
    expect(result.portalUrl).toContain('/acme-security');
  });
});

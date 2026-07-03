import { GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@db';
import { getSignedUrl } from '../app/s3';
import { CreateAccessRequestDto } from './dto/trust-access.dto';
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
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    trustAccessRequest: {
      findFirst: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
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
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  trustAccessRequest: {
    findFirst: jest.Mock;
  };
  member: {
    findFirst: jest.Mock;
  };
  $transaction: jest.Mock;
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

describe('TrustAccessService approveRequest NDA bypass', () => {
  const emailService = {
    sendAccessGrantedEmail: jest.fn(),
    sendNdaSigningEmail: jest.fn(),
  };
  const service = new TrustAccessService(
    {} as any,
    emailService as any,
    {} as any,
    {} as any,
    {} as any,
  );
  const buildPortalAccessUrlSpy = jest.spyOn(
    service as any,
    'buildPortalAccessUrl',
  );

  const baseRequest = {
    id: 'tar_1',
    status: 'under_review',
    email: 'chang.liu@client.com',
    name: 'Chang Liu',
    requestedDurationDays: 30,
    organization: { name: 'Acme Security' },
  };

  let txMock: {
    trustAccessRequest: { update: jest.Mock };
    trustAccessGrant: { create: jest.Mock };
    trustNDAAgreement: { create: jest.Mock };
    auditLog: { create: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    txMock = {
      trustAccessRequest: {
        update: jest
          .fn()
          .mockResolvedValue({ id: 'tar_1', status: 'approved' }),
      },
      trustAccessGrant: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'tag_1', expiresAt: new Date() }),
      },
      trustNDAAgreement: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'tna_1', signToken: 'sign-token' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    mockDb.trustAccessRequest.findFirst.mockResolvedValue(baseRequest);
    mockDb.member.findFirst.mockResolvedValue({ id: 'mem_1', userId: 'usr_1' });
    mockDb.$transaction.mockImplementation(
      (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock),
    );
    buildPortalAccessUrlSpy.mockResolvedValue(
      'https://portal.example.com/access/token',
    );
  });

  it('bypasses NDA when the exact email is allow-listed', async () => {
    mockDb.trust.findUnique.mockResolvedValue({
      allowedDomains: [],
      allowedEmails: ['chang.liu@client.com'],
    });

    const result = await service.approveRequest('org_1', 'tar_1', {}, 'mem_1');

    expect(txMock.trustAccessGrant.create).toHaveBeenCalledTimes(1);
    expect(txMock.trustNDAAgreement.create).not.toHaveBeenCalled();
    expect(emailService.sendAccessGrantedEmail).toHaveBeenCalledTimes(1);
    // The granted email must omit NDA copy since no NDA was signed.
    expect(emailService.sendAccessGrantedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ ndaBypassed: true }),
    );
    expect(emailService.sendNdaSigningEmail).not.toHaveBeenCalled();
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            ndaBypassed: true,
            bypassReason: 'allowed email',
          }),
        }),
      }),
    );
    expect(result.message).toBe('Access granted');
  });

  it('bypasses NDA via domain match and records the domain reason', async () => {
    mockDb.trust.findUnique.mockResolvedValue({
      allowedDomains: ['client.com'],
      allowedEmails: [],
    });

    await service.approveRequest('org_1', 'tar_1', {}, 'mem_1');

    expect(txMock.trustAccessGrant.create).toHaveBeenCalledTimes(1);
    expect(emailService.sendAccessGrantedEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendAccessGrantedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ ndaBypassed: true }),
    );
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({ bypassReason: 'allowed domain' }),
        }),
      }),
    );
  });

  it('requires NDA signing when neither email nor domain is allow-listed', async () => {
    mockDb.trust.findUnique.mockResolvedValue({
      allowedDomains: ['other.com'],
      allowedEmails: ['someone@else.com'],
    });

    const result = await service.approveRequest('org_1', 'tar_1', {}, 'mem_1');

    expect(txMock.trustNDAAgreement.create).toHaveBeenCalledTimes(1);
    expect(txMock.trustAccessGrant.create).not.toHaveBeenCalled();
    expect(emailService.sendNdaSigningEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendAccessGrantedEmail).not.toHaveBeenCalled();
    expect(result.message).toBe('NDA signing email sent');
  });
});

describe('TrustAccessService resendAccessGrantEmail NDA copy', () => {
  const emailService = {
    sendAccessGrantedEmail: jest.fn(),
  };
  const service = new TrustAccessService(
    {} as any,
    emailService as any,
    {} as any,
    {} as any,
    {} as any,
  );
  jest
    .spyOn(service as any, 'buildPortalAccessUrl')
    .mockResolvedValue('https://portal.example.com/access/token');

  const baseGrant = {
    id: 'tag_1',
    subjectEmail: 'chang.liu@client.com',
    status: 'active',
    expiresAt: new Date(Date.now() + 86_400_000),
    accessToken: 'existing-token',
    accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
    accessRequest: {
      name: 'Chang Liu',
      organization: { name: 'Acme Security' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks the resent email as bypassed when the grant has no NDA agreement', async () => {
    mockDb.trustAccessGrant.findFirst.mockResolvedValue({
      ...baseGrant,
      ndaAgreement: null,
    });

    await service.resendAccessGrantEmail('org_1', 'tag_1');

    expect(emailService.sendAccessGrantedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ ndaBypassed: true }),
    );
  });

  it('keeps NDA copy when the grant has a signed NDA agreement', async () => {
    mockDb.trustAccessGrant.findFirst.mockResolvedValue({
      ...baseGrant,
      ndaAgreement: { status: 'signed' },
    });

    await service.resendAccessGrantEmail('org_1', 'tag_1');

    expect(emailService.sendAccessGrantedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ ndaBypassed: false }),
    );
  });

  it('rotates an expired token to expire with the grant, not a fixed 24h window', async () => {
    const grantExpiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    mockDb.trustAccessGrant.findFirst.mockResolvedValue({
      ...baseGrant,
      expiresAt: grantExpiresAt,
      accessTokenExpiresAt: new Date(Date.now() - 1000),
      ndaAgreement: null,
    });

    await service.resendAccessGrantEmail('org_1', 'tag_1');

    expect(mockDb.trustAccessGrant.update).toHaveBeenCalledWith({
      where: { id: 'tag_1' },
      data: expect.objectContaining({ accessTokenExpiresAt: grantExpiresAt }),
    });
  });
});

describe('TrustAccessService signNda NDA copy', () => {
  const ndaPdfService = {
    generateNdaPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    uploadNdaPdf: jest.fn().mockResolvedValue('org_1/nda/nda_1.pdf'),
    getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/nda.pdf'),
  };
  const emailService = {
    sendAccessGrantedEmail: jest.fn(),
  };
  const service = new TrustAccessService(
    ndaPdfService as any,
    emailService as any,
    {} as any,
    {} as any,
    {} as any,
  );
  jest
    .spyOn(service as any, 'buildPortalAccessUrl')
    .mockResolvedValue('https://portal.example.com/access/token');

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.trustNDAAgreement.findUnique.mockResolvedValue({
      id: 'nda_1',
      organizationId: 'org_1',
      accessRequestId: 'tar_1',
      status: 'pending',
      signTokenExpiresAt: new Date(Date.now() + 86_400_000),
      grant: null,
      accessRequest: {
        requestedDurationDays: 30,
        organization: { name: 'Acme Security' },
      },
    });
    mockDb.$transaction.mockImplementation(
      (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          trustAccessGrant: {
            create: jest
              .fn()
              .mockResolvedValue({ id: 'tag_1', expiresAt: new Date() }),
          },
          trustNDAAgreement: {
            update: jest.fn().mockResolvedValue({ id: 'nda_1' }),
          },
        }),
    );
  });

  it('sends the granted email with NDA copy (ndaBypassed: false) after signing', async () => {
    await service.signNda(
      'sign-token',
      'Chang Liu',
      'chang.liu@client.com',
      '1.2.3.4',
      'jest-agent',
    );

    expect(emailService.sendAccessGrantedEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendAccessGrantedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ ndaBypassed: false }),
    );
  });
});

describe('TrustAccessService reclaimAccess token rotation', () => {
  const emailService = {
    sendAccessReclaimEmail: jest.fn(),
  };
  const service = new TrustAccessService(
    {} as any,
    emailService as any,
    {} as any,
    {} as any,
    {} as any,
  );
  jest
    .spyOn(service as any, 'buildPortalAccessUrl')
    .mockResolvedValue('https://portal.example.com/access/token');

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.trust.findUnique.mockResolvedValue({
      organizationId: 'org_1',
      friendlyUrl: 'acme-security',
      status: 'published',
    });
  });

  it('rotates an expired access token to expire with the grant, not a fixed 24h window', async () => {
    const grantExpiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    mockDb.trustAccessGrant.findFirst.mockResolvedValue({
      id: 'tag_1',
      subjectEmail: 'chang.liu@client.com',
      status: 'active',
      expiresAt: grantExpiresAt,
      accessToken: 'stale-token',
      accessTokenExpiresAt: new Date(Date.now() - 1000),
      accessRequest: {
        name: 'Chang Liu',
        organization: { name: 'Acme Security' },
      },
      ndaAgreement: null,
    });

    await service.reclaimAccess('acme-security', 'chang.liu@client.com');

    expect(mockDb.trustAccessGrant.update).toHaveBeenCalledWith({
      where: { id: 'tag_1' },
      data: expect.objectContaining({ accessTokenExpiresAt: grantExpiresAt }),
    });
  });
});

describe('TrustAccessService access request notification', () => {
  const emailService = {
    sendAccessRequestNotification: jest.fn(),
  };
  const service = new TrustAccessService(
    ...([{}, emailService, {}, {}, {}] as unknown as ConstructorParameters<
      typeof TrustAccessService
    >),
  );

  const ORIGINAL_BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BETTER_AUTH_URL = 'https://app.trycomp.ai';
  });

  afterAll(() => {
    process.env.BETTER_AUTH_URL = ORIGINAL_BETTER_AUTH_URL;
  });

  it('points the review button at the access requests page, not the trust overview', async () => {
    // contactEmail present -> single recipient, no member fallback lookup.
    mockDb.trust.findUnique.mockResolvedValue({ contactEmail: 'owner@acme.com' });

    const dto: CreateAccessRequestDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
    };

    await service['sendAccessRequestNotificationToOrg'](
      'org_123',
      'tar_456',
      'Acme Inc',
      dto,
    );

    expect(emailService.sendAccessRequestNotification).toHaveBeenCalledTimes(1);
    // Must deep-link to the pending requests list, NOT /org_123/trust (the
    // trust portal settings/overview page).
    expect(emailService.sendAccessRequestNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewUrl: 'https://app.trycomp.ai/org_123/trust/access-requests',
      }),
    );
  });
});

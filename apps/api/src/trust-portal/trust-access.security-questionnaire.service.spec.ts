import { db } from '@db';
import { TrustAccessService } from './trust-access.service';

jest.mock('@db', () => ({
  db: {
    trust: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
  Prisma: {},
  TrustFramework: {},
}));

jest.mock('../app/s3', () => ({
  APP_AWS_ORG_ASSETS_BUCKET: 'org-assets',
  s3Client: { send: jest.fn() },
  getSignedUrl: jest.fn(),
}));

const mockDb = db as unknown as {
  trust: { findUnique: jest.Mock; findFirst: jest.Mock };
};

describe('TrustAccessService.getPublicSecurityQuestionnaireEnabled', () => {
  const service = new TrustAccessService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves by friendlyUrl first', async () => {
    mockDb.trust.findFirst.mockResolvedValue({
      securityQuestionnaireEnabled: false,
    });

    const result = await service.getPublicSecurityQuestionnaireEnabled('acme');

    expect(result).toBe(false);
    expect(mockDb.trust.findFirst).toHaveBeenCalledTimes(1);
    expect(mockDb.trust.findFirst).toHaveBeenNthCalledWith(1, {
      where: { friendlyUrl: 'acme', status: 'published' },
      select: { securityQuestionnaireEnabled: true },
    });
  });

  it('falls back to organizationId when friendlyUrl does not match', async () => {
    mockDb.trust.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ securityQuestionnaireEnabled: false });

    const result =
      await service.getPublicSecurityQuestionnaireEnabled('org_123');

    expect(result).toBe(false);
    expect(mockDb.trust.findFirst).toHaveBeenNthCalledWith(2, {
      where: { organizationId: 'org_123', status: 'published' },
      select: { securityQuestionnaireEnabled: true },
    });
  });

  it('returns true when the flag is enabled', async () => {
    mockDb.trust.findFirst.mockResolvedValue({
      securityQuestionnaireEnabled: true,
    });

    await expect(
      service.getPublicSecurityQuestionnaireEnabled('acme'),
    ).resolves.toBe(true);
  });

  it('defaults to enabled when the portal cannot be resolved', async () => {
    mockDb.trust.findFirst.mockResolvedValue(null);

    await expect(
      service.getPublicSecurityQuestionnaireEnabled('unknown'),
    ).resolves.toBe(true);
  });
});

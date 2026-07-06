import { db } from '@db';
import { TrustAccessService } from './trust-access.service';

jest.mock('@db', () => ({
  db: {
    trust: {
      findUnique: jest.fn(),
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
  trust: { findUnique: jest.Mock };
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
    mockDb.trust.findUnique.mockResolvedValue({
      securityQuestionnaireEnabled: false,
    });

    const result = await service.getPublicSecurityQuestionnaireEnabled('acme');

    expect(result).toBe(false);
    expect(mockDb.trust.findUnique).toHaveBeenCalledTimes(1);
    expect(mockDb.trust.findUnique).toHaveBeenNthCalledWith(1, {
      where: { friendlyUrl: 'acme' },
      select: { securityQuestionnaireEnabled: true },
    });
  });

  it('falls back to organizationId when friendlyUrl does not match', async () => {
    mockDb.trust.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ securityQuestionnaireEnabled: false });

    const result =
      await service.getPublicSecurityQuestionnaireEnabled('org_123');

    expect(result).toBe(false);
    expect(mockDb.trust.findUnique).toHaveBeenNthCalledWith(2, {
      where: { organizationId: 'org_123' },
      select: { securityQuestionnaireEnabled: true },
    });
  });

  it('returns true when the flag is enabled', async () => {
    mockDb.trust.findUnique.mockResolvedValue({
      securityQuestionnaireEnabled: true,
    });

    await expect(
      service.getPublicSecurityQuestionnaireEnabled('acme'),
    ).resolves.toBe(true);
  });

  it('defaults to enabled when the portal cannot be resolved', async () => {
    mockDb.trust.findUnique.mockResolvedValue(null);

    await expect(
      service.getPublicSecurityQuestionnaireEnabled('unknown'),
    ).resolves.toBe(true);
  });
});

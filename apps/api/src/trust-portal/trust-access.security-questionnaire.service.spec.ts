import { db } from '@db';
import { TrustAccessService } from './trust-access.service';

jest.mock('@db', () => ({
  db: {
    trust: {
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
  trust: { findFirst: jest.Mock };
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

  it('resolves by friendlyUrl OR organizationId', async () => {
    mockDb.trust.findFirst.mockResolvedValue({
      securityQuestionnaireEnabled: false,
    });

    const result = await service.getPublicSecurityQuestionnaireEnabled('acme');

    expect(result).toBe(false);
    expect(mockDb.trust.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ friendlyUrl: 'acme' }, { organizationId: 'acme' }] },
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

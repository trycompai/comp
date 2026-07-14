import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { TrustPortalService } from './trust-portal.service';

jest.mock('@db', () => ({
  db: {
    trust: {
      findUnique: jest.fn(),
      update: jest.fn(),
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
  trust: { findUnique: jest.Mock; update: jest.Mock };
};

describe('TrustPortalService.updateSecurityQuestionnaireEnabled', () => {
  const service = new TrustPortalService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists the flag when the trust portal exists', async () => {
    mockDb.trust.findUnique.mockResolvedValue({ organizationId: 'org_1' });
    mockDb.trust.update.mockResolvedValue({
      organizationId: 'org_1',
      securityQuestionnaireEnabled: false,
    });

    await service.updateSecurityQuestionnaireEnabled('org_1', false);

    expect(mockDb.trust.update).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      data: { securityQuestionnaireEnabled: false },
    });
  });

  it('re-enables the questionnaire when set to true', async () => {
    mockDb.trust.findUnique.mockResolvedValue({ organizationId: 'org_1' });
    mockDb.trust.update.mockResolvedValue({});

    await service.updateSecurityQuestionnaireEnabled('org_1', true);

    expect(mockDb.trust.update).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      data: { securityQuestionnaireEnabled: true },
    });
  });

  it('throws NotFound and does not write when the trust portal is missing', async () => {
    mockDb.trust.findUnique.mockResolvedValue(null);

    await expect(
      service.updateSecurityQuestionnaireEnabled('org_missing', false),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockDb.trust.update).not.toHaveBeenCalled();
  });
});

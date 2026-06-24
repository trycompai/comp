jest.mock('@db', () => ({
  db: {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
  Role: {},
}));

jest.mock('../app/s3', () => ({
  s3Client: {},
  getSignedUrl: jest.fn(),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  APP_AWS_ORG_ASSETS_BUCKET: 'bucket',
}));

jest.mock('@trycompai/auth', () => ({
  allRoles: {},
}));

import { db } from '@db';
import { OrganizationService } from './organization.service';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';

const mockedDb = db as unknown as {
  organization: { findUnique: jest.Mock; update: jest.Mock };
};

describe('OrganizationService.updateById', () => {
  const service = new OrganizationService();
  const existing = {
    id: 'org_1',
    name: 'Acme',
    slug: 'acme',
    logo: null,
    metadata: null,
    website: null,
    onboardingCompleted: false,
    hasAccess: false,
    fleetDmLabelId: null,
    isFleetSetupCompleted: false,
    primaryColor: null,
    advancedModeEnabled: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.organization.findUnique.mockResolvedValue(existing);
    mockedDb.organization.update.mockResolvedValue(existing);
  });

  it('persists the profile fields that were provided', async () => {
    await service.updateById('org_1', {
      name: 'New Name',
      website: 'https://acme.com',
    });

    const arg = mockedDb.organization.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'org_1' });
    expect(arg.data.name).toBe('New Name');
    expect(arg.data.website).toBe('https://acme.com');
  });

  it('persists the org-owned onboarding and portal toggles', async () => {
    await service.updateById('org_1', {
      evidenceApprovalEnabled: true,
      deviceAgentStepEnabled: false,
      securityTrainingStepEnabled: false,
      whistleblowerReportEnabled: false,
      accessRequestFormEnabled: true,
    });

    const arg = mockedDb.organization.update.mock.calls[0][0];
    expect(arg.data.evidenceApprovalEnabled).toBe(true);
    expect(arg.data.deviceAgentStepEnabled).toBe(false);
    expect(arg.data.securityTrainingStepEnabled).toBe(false);
    expect(arg.data.whistleblowerReportEnabled).toBe(false);
    expect(arg.data.accessRequestFormEnabled).toBe(true);
  });

  it('never persists hasAccess supplied through the update payload', async () => {
    const payload = {
      name: 'New Name',
      hasAccess: true,
    } as unknown as UpdateOrganizationDto;

    await service.updateById('org_1', payload);

    const arg = mockedDb.organization.update.mock.calls[0][0];
    expect(arg.data).not.toHaveProperty('hasAccess');
  });
});

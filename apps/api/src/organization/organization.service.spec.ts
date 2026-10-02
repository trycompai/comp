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

import { BadRequestException } from '@nestjs/common';
import { db } from '@db';
import { getSignedUrl } from '../app/s3';
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

  it('rejects a logo key scoped to a different organization', async () => {
    await expect(
      service.updateById('org_1', { logo: 'org_2/logo/1-evil.png' }),
    ).rejects.toThrow(BadRequestException);

    expect(mockedDb.organization.update).not.toHaveBeenCalled();
  });

  it('accepts a logo key scoped to the organization being updated', async () => {
    await service.updateById('org_1', { logo: 'org_1/logo/1-mark.png' });

    const arg = mockedDb.organization.update.mock.calls[0][0];
    expect(arg.data.logo).toBe('org_1/logo/1-mark.png');
  });

  it('allows clearing the logo', async () => {
    await service.updateById('org_1', { logo: '' });

    const arg = mockedDb.organization.update.mock.calls[0][0];
    expect(arg.data.logo).toBe('');
  });
});

describe('OrganizationService.getLogoSignedUrl', () => {
  const service = new OrganizationService();
  const mockedGetSignedUrl = getSignedUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSignedUrl.mockResolvedValue('https://signed.example.com/logo.png');
  });

  it('returns null for a key scoped to a different organization', async () => {
    const result = await service.getLogoSignedUrl({
      logoKey: 'org_2/logo/1-evil.png',
      organizationId: 'org_1',
    });

    expect(result).toBeNull();
    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
  });

  it('presigns a key scoped to the requesting organization', async () => {
    const result = await service.getLogoSignedUrl({
      logoKey: 'org_1/logo/1-mark.png',
      organizationId: 'org_1',
    });

    expect(result).toBe('https://signed.example.com/logo.png');
    expect(mockedGetSignedUrl).toHaveBeenCalled();
  });

  it('returns null when no logo key is stored', async () => {
    const result = await service.getLogoSignedUrl({
      logoKey: null,
      organizationId: 'org_1',
    });

    expect(result).toBeNull();
  });
});

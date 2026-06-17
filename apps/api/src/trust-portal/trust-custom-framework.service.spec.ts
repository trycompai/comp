import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { TrustCustomFrameworkService } from './trust-custom-framework.service';
import type { TrustCustomFrameworkBadgeService } from './trust-custom-framework-badge.service';

jest.mock('@db', () => ({
  db: {
    customFramework: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    trustCustomFramework: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    trustResource: {
      findMany: jest.fn(),
    },
    trust: {
      findUnique: jest.fn(),
    },
  },
}));

const mockDb = db as unknown as {
  customFramework: { findMany: jest.Mock; findFirst: jest.Mock };
  trustCustomFramework: { findMany: jest.Mock; upsert: jest.Mock };
  trustResource: { findMany: jest.Mock };
  trust: { findUnique: jest.Mock };
};

describe('TrustCustomFrameworkService', () => {
  let service: TrustCustomFrameworkService;
  let badgeService: { signBadgeUrl: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    // Read paths only depend on signBadgeUrl; default to "no badge" (null).
    badgeService = { signBadgeUrl: jest.fn().mockResolvedValue(null) };
    service = new TrustCustomFrameworkService(
      badgeService as unknown as TrustCustomFrameworkBadgeService,
    );
  });

  describe('listForOrg', () => {
    it('merges custom frameworks with selection state and certificates', async () => {
      mockDb.customFramework.findMany.mockResolvedValue([
        { id: 'cfrm_a', name: 'Acme Std', description: 'Internal' },
        { id: 'cfrm_b', name: 'HR Base', description: 'HR' },
      ]);
      mockDb.trustCustomFramework.findMany.mockResolvedValue([
        { customFrameworkId: 'cfrm_a', enabled: true, status: 'compliant' },
      ]);
      mockDb.trustResource.findMany.mockResolvedValue([
        { customFrameworkId: 'cfrm_a', fileName: 'acme.pdf' },
      ]);

      const result = await service.listForOrg('org_1');

      expect(result).toEqual([
        {
          customFrameworkId: 'cfrm_a',
          name: 'Acme Std',
          description: 'Internal',
          enabled: true,
          status: 'compliant',
          hasCertificate: true,
          certificateFileName: 'acme.pdf',
          badgeUrl: null,
        },
        {
          // Never configured for the portal -> disabled / started / no cert.
          customFrameworkId: 'cfrm_b',
          name: 'HR Base',
          description: 'HR',
          enabled: false,
          status: 'started',
          hasCertificate: false,
          certificateFileName: null,
          badgeUrl: null,
        },
      ]);
      expect(mockDb.customFramework.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      });
    });

    it('returns an empty array when the org has no custom frameworks', async () => {
      mockDb.customFramework.findMany.mockResolvedValue([]);
      mockDb.trustCustomFramework.findMany.mockResolvedValue([]);
      mockDb.trustResource.findMany.mockResolvedValue([]);

      await expect(service.listForOrg('org_1')).resolves.toEqual([]);
    });

    it('resolves a signed badgeUrl when a badge key is stored', async () => {
      mockDb.customFramework.findMany.mockResolvedValue([
        { id: 'cfrm_a', name: 'Acme Std', description: 'Internal' },
      ]);
      mockDb.trustCustomFramework.findMany.mockResolvedValue([
        {
          customFrameworkId: 'cfrm_a',
          enabled: true,
          status: 'compliant',
          badgeS3Key: 'org_1/trust/custom-framework/cfrm_a/badge/1-logo.png',
        },
      ]);
      mockDb.trustResource.findMany.mockResolvedValue([]);
      badgeService.signBadgeUrl.mockResolvedValue('https://signed/badge.png');

      const result = await service.listForOrg('org_1');

      expect(result[0].badgeUrl).toBe('https://signed/badge.png');
      expect(badgeService.signBadgeUrl).toHaveBeenCalledWith(
        'org_1/trust/custom-framework/cfrm_a/badge/1-logo.png',
      );
    });
  });

  describe('updateSelection', () => {
    it('throws NotFound when the custom framework is not in the org', async () => {
      mockDb.customFramework.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSelection('org_1', {
          customFrameworkId: 'cfrm_x',
          enabled: true,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockDb.trustCustomFramework.upsert).not.toHaveBeenCalled();
    });

    it('upserts only the provided fields', async () => {
      mockDb.customFramework.findFirst.mockResolvedValue({ id: 'cfrm_a' });
      mockDb.trustCustomFramework.upsert.mockResolvedValue({});

      await service.updateSelection('org_1', {
        customFrameworkId: 'cfrm_a',
        status: 'in_progress',
      });

      expect(mockDb.trustCustomFramework.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_customFrameworkId: {
            organizationId: 'org_1',
            customFrameworkId: 'cfrm_a',
          },
        },
        create: {
          organizationId: 'org_1',
          customFrameworkId: 'cfrm_a',
          status: 'in_progress',
        },
        update: { status: 'in_progress' },
      });
    });

    it('scopes the tenant check by organizationId', async () => {
      mockDb.customFramework.findFirst.mockResolvedValue({ id: 'cfrm_a' });
      mockDb.trustCustomFramework.upsert.mockResolvedValue({});

      await service.updateSelection('org_1', {
        customFrameworkId: 'cfrm_a',
        enabled: false,
      });

      expect(mockDb.customFramework.findFirst).toHaveBeenCalledWith({
        where: { id: 'cfrm_a', organizationId: 'org_1' },
        select: { id: true },
      });
    });
  });

  describe('getPublicCustomFrameworks', () => {
    it('returns [] when no trust portal resolves for the friendly URL', async () => {
      mockDb.trust.findUnique.mockResolvedValue(null);

      await expect(
        service.getPublicCustomFrameworks('unknown'),
      ).resolves.toEqual([]);
      expect(mockDb.trustCustomFramework.findMany).not.toHaveBeenCalled();
    });

    it('returns only enabled frameworks with certificate flags', async () => {
      mockDb.trust.findUnique.mockResolvedValue({ organizationId: 'org_1' });
      mockDb.trustCustomFramework.findMany.mockResolvedValue([
        {
          status: 'compliant',
          customFramework: { id: 'cfrm_a', name: 'Acme Std', description: 'x' },
        },
      ]);
      mockDb.trustResource.findMany.mockResolvedValue([
        { customFrameworkId: 'cfrm_a' },
      ]);

      const result = await service.getPublicCustomFrameworks('acme');

      expect(result).toEqual([
        {
          id: 'cfrm_a',
          name: 'Acme Std',
          description: 'x',
          status: 'compliant',
          hasCertificate: true,
          badgeUrl: null,
        },
      ]);
      expect(mockDb.trustCustomFramework.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_1', enabled: true },
        select: {
          status: true,
          badgeS3Key: true,
          customFramework: {
            select: { id: true, name: true, description: true },
          },
        },
        orderBy: { customFramework: { name: 'asc' } },
      });
    });

    it('falls back to resolving the route id as an organizationId', async () => {
      mockDb.trust.findUnique
        .mockResolvedValueOnce(null) // friendlyUrl miss
        .mockResolvedValueOnce({ organizationId: 'org_1' }); // org id hit
      mockDb.trustCustomFramework.findMany.mockResolvedValue([]);

      await service.getPublicCustomFrameworks('org_1');

      expect(mockDb.trust.findUnique).toHaveBeenNthCalledWith(1, {
        where: { friendlyUrl: 'org_1' },
        select: { organizationId: true },
      });
      expect(mockDb.trust.findUnique).toHaveBeenNthCalledWith(2, {
        where: { organizationId: 'org_1' },
        select: { organizationId: true },
      });
    });
  });
});

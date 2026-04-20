import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FrameworksService } from './frameworks.service';

jest.mock('@db', () => ({
  db: {
    frameworkInstance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    frameworkEditorRequirement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    customRequirement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    requirementMap: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    evidenceSubmission: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('./frameworks-scores.helper', () => ({
  getOverviewScores: jest.fn(),
  getCurrentMember: jest.fn(),
  computeFrameworkComplianceScore: jest.fn(),
}));

import { db } from '@db';
import {
  getOverviewScores,
  getCurrentMember,
} from './frameworks-scores.helper';

const mockDb = db as jest.Mocked<typeof db>;

describe('FrameworksService', () => {
  let service: FrameworksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FrameworksService],
    }).compile();

    service = module.get<FrameworksService>(FrameworksService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return framework instances with framework relation', async () => {
      const mockInstances = [
        {
          id: 'fi1',
          organizationId: 'org_1',
          frameworkId: 'f1',
          framework: { id: 'f1', name: 'ISO 27001' },
        },
      ];
      (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue(
        mockInstances,
      );

      const result = await service.findAll('org_1');

      expect(result).toEqual(mockInstances);
      expect(mockDb.frameworkInstance.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
        include: { framework: true, customFramework: true },
      });
    });

    it('should return empty array when no instances exist', async () => {
      (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll('org_1');

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete framework instance and return success', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        id: 'fi1',
        organizationId: 'org_1',
      });
      (mockDb.frameworkInstance.delete as jest.Mock).mockResolvedValue({});

      const result = await service.delete('fi1', 'org_1');

      expect(result).toEqual({ success: true });
      expect(mockDb.frameworkInstance.findUnique).toHaveBeenCalledWith({
        where: { id: 'fi1', organizationId: 'org_1' },
      });
      expect(mockDb.frameworkInstance.delete).toHaveBeenCalledWith({
        where: { id: 'fi1' },
      });
    });

    it('should throw NotFoundException when instance not found', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.delete('missing', 'org_1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDb.frameworkInstance.delete).not.toHaveBeenCalled();
    });
  });

  describe('getScores', () => {
    it('should call getOverviewScores and getCurrentMember when userId is provided', async () => {
      const mockScores = { policies: 10, tasks: 5 };
      const mockMember = { id: 'mem_1', userId: 'user_1' };

      (getOverviewScores as jest.Mock).mockResolvedValue(mockScores);
      (getCurrentMember as jest.Mock).mockResolvedValue(mockMember);

      const result = await service.getScores('org_1', 'user_1');

      expect(getOverviewScores).toHaveBeenCalledWith('org_1');
      expect(getCurrentMember).toHaveBeenCalledWith('org_1', 'user_1');
      expect(result).toEqual({
        ...mockScores,
        currentMember: mockMember,
      });
    });

    it('should call getOverviewScores but NOT getCurrentMember when userId is undefined', async () => {
      const mockScores = { policies: 10, tasks: 5 };

      (getOverviewScores as jest.Mock).mockResolvedValue(mockScores);

      const result = await service.getScores('org_1');

      expect(getOverviewScores).toHaveBeenCalledWith('org_1');
      expect(getCurrentMember).not.toHaveBeenCalled();
      expect(result).toEqual({
        ...mockScores,
        currentMember: null,
      });
    });
  });

  // Regression coverage for the cross-tenant leak that existed on this branch
  // before the split: previously both findOne and findRequirement read from
  // FrameworkEditorRequirement without filtering by organizationId, so an org's
  // request could surface another org's custom requirements sharing a framework.
  // With the split, a custom framework instance reads from `customRequirement`
  // (which is always org-scoped) and a platform framework instance reads from
  // the global `frameworkEditorRequirement`. There is no shared table to leak.
  describe('custom-framework isolation', () => {
    it('findOne on a custom FI reads only that org\'s custom requirements', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        id: 'fi_custom',
        organizationId: 'org_A',
        frameworkId: null,
        customFrameworkId: 'cfrm_A',
        customFramework: { id: 'cfrm_A', name: 'A Custom' },
        framework: null,
        requirementsMapped: [],
      });
      (mockDb.customRequirement.findMany as jest.Mock).mockResolvedValue([
        { id: 'creq_1', name: 'R1', identifier: 'R1', description: '' },
      ]);
      (mockDb.task.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.requirementMap.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.evidenceSubmission.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findOne('fi_custom', 'org_A');

      expect(mockDb.customRequirement.findMany).toHaveBeenCalledWith({
        where: { customFrameworkId: 'cfrm_A' },
        orderBy: { name: 'asc' },
      });
      expect(
        mockDb.frameworkEditorRequirement.findMany,
      ).not.toHaveBeenCalled();
      expect(result.requirementDefinitions).toHaveLength(1);
    });

    it('findOne on a platform FI reads only FrameworkEditorRequirement', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        id: 'fi_platform',
        organizationId: 'org_A',
        frameworkId: 'frk_soc2',
        customFrameworkId: null,
        framework: { id: 'frk_soc2', name: 'SOC 2' },
        customFramework: null,
        requirementsMapped: [],
      });
      (
        mockDb.frameworkEditorRequirement.findMany as jest.Mock
      ).mockResolvedValue([
        { id: 'frk_rq_1', name: 'CC1', identifier: 'cc1-1', description: '' },
      ]);
      (mockDb.task.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.requirementMap.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.evidenceSubmission.findMany as jest.Mock).mockResolvedValue([]);

      await service.findOne('fi_platform', 'org_A');

      expect(mockDb.frameworkEditorRequirement.findMany).toHaveBeenCalledWith({
        where: { frameworkId: 'frk_soc2' },
        orderBy: { name: 'asc' },
      });
      expect(mockDb.customRequirement.findMany).not.toHaveBeenCalled();
    });

    it('createRequirement rejects a platform framework instance', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        customFrameworkId: null,
      });

      await expect(
        service.createRequirement('fi_platform', 'org_A', {
          name: 'x',
          identifier: 'x',
          description: 'x',
        }),
      ).rejects.toThrow(/Cannot add custom requirements/);
      expect(mockDb.customRequirement.create).not.toHaveBeenCalled();
    });
  });
});

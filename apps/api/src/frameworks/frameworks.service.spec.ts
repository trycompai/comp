import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FrameworksService } from './frameworks.service';
import { TimelinesService } from '../timelines/timelines.service';

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
      createManyAndReturn: jest.fn(),
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
    frameworkEditorFramework: {
      findMany: jest.fn(),
    },
    customFramework: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
  // The frameworks-timeline helper imports FindingType (a Prisma enum) at module
  // load. Stub it so the spec file can be evaluated without the real client.
  FindingType: { soc2: 'soc2', iso27001: 'iso27001' },
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
      providers: [
        FrameworksService,
        { provide: TimelinesService, useValue: {} },
      ],
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

  describe('updateCustom', () => {
    it('should update the custom framework name and description', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        customFrameworkId: 'cfrm_A',
      });
      const updated = {
        id: 'cfrm_A',
        name: 'CSC/CPRT',
        description: 'Renamed',
      };
      (mockDb.customFramework.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateCustom('fi1', 'org_1', {
        name: 'CSC/CPRT',
        description: 'Renamed',
      });

      expect(result).toEqual(updated);
      expect(mockDb.frameworkInstance.findUnique).toHaveBeenCalledWith({
        where: { id: 'fi1', organizationId: 'org_1' },
        select: { customFrameworkId: true },
      });
      expect(mockDb.customFramework.update).toHaveBeenCalledWith({
        where: { id: 'cfrm_A' },
        data: { name: 'CSC/CPRT', description: 'Renamed' },
      });
    });

    it('should only update the fields that are provided', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        customFrameworkId: 'cfrm_A',
      });
      (mockDb.customFramework.update as jest.Mock).mockResolvedValue({});

      await service.updateCustom('fi1', 'org_1', { name: 'Just the name' });

      expect(mockDb.customFramework.update).toHaveBeenCalledWith({
        where: { id: 'cfrm_A' },
        data: { name: 'Just the name' },
      });
    });

    it('should throw BadRequestException when no fields are provided', async () => {
      await expect(
        service.updateCustom('fi1', 'org_1', {}),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.frameworkInstance.findUnique).not.toHaveBeenCalled();
      expect(mockDb.customFramework.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when instance not found', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.updateCustom('missing', 'org_1', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.customFramework.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for a platform framework', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        customFrameworkId: null,
      });

      await expect(
        service.updateCustom('fi_platform', 'org_1', { name: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.customFramework.update).not.toHaveBeenCalled();
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

  // Regression coverage for "GDPR framework showing as HIPAA": findAvailable
  // feeds the setup screen, which auto-selects visibleFrameworks[0] when the
  // user hasn't toggled a pill. Without a deterministic orderBy, Postgres
  // returned platform frameworks in arbitrary order, so the silent default
  // could land on the wrong framework (e.g. HIPAA when GDPR was expected).
  describe('findAvailable', () => {
    beforeEach(() => {
      (mockDb.frameworkEditorFramework.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (mockDb.customFramework.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('orders platform frameworks deterministically by name', async () => {
      await service.findAvailable();

      expect(mockDb.frameworkEditorFramework.findMany).toHaveBeenCalledWith({
        where: { visible: true },
        include: { requirements: true },
        orderBy: { name: 'asc' },
      });
    });

    it('orders an org\'s custom frameworks deterministically by name', async () => {
      await service.findAvailable('org_1');

      expect(mockDb.customFramework.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
        include: { requirements: true },
        orderBy: { name: 'asc' },
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

    it('findOne on a platform FI merges per-instance custom requirements with platform requirements', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        id: 'fi_platform',
        organizationId: 'org_A',
        frameworkId: 'frk_soc2',
        customFrameworkId: null,
        currentVersionId: null,
        framework: { id: 'frk_soc2', name: 'SOC 2' },
        customFramework: null,
        requirementsMapped: [],
      });
      (
        mockDb.frameworkEditorRequirement.findMany as jest.Mock
      ).mockResolvedValue([
        { id: 'frk_rq_1', name: 'CC1', identifier: 'cc1-1', description: '' },
      ]);
      // Per-instance custom requirement attached directly to fi_platform.
      (mockDb.customRequirement.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'creq_local',
          name: 'Org-local extra',
          identifier: 'X1',
          description: '',
        },
      ]);
      (mockDb.task.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.requirementMap.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.evidenceSubmission.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findOne('fi_platform', 'org_A');

      expect(mockDb.frameworkEditorRequirement.findMany).toHaveBeenCalledWith({
        where: { frameworkId: 'frk_soc2' },
        orderBy: { name: 'asc' },
      });
      expect(mockDb.customRequirement.findMany).toHaveBeenCalledWith({
        where: { frameworkInstanceId: 'fi_platform' },
        orderBy: { name: 'asc' },
      });
      const ids = result.requirementDefinitions.map((r: any) => r.id);
      expect(ids).toEqual(expect.arrayContaining(['frk_rq_1', 'creq_local']));
    });

    it('createRequirement on a custom-framework FI hangs the row off the framework', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        id: 'fi_custom',
        customFrameworkId: 'cfrm_A',
      });
      (mockDb.customRequirement.create as jest.Mock).mockResolvedValue({
        id: 'creq_new',
      });

      await service.createRequirement('fi_custom', 'org_A', {
        name: 'x',
        identifier: 'x',
        description: 'x',
      });

      expect(mockDb.customRequirement.create).toHaveBeenCalledWith({
        data: {
          name: 'x',
          identifier: 'x',
          description: 'x',
          organizationId: 'org_A',
          customFrameworkId: 'cfrm_A',
        },
      });
    });

    it('createRequirement on a platform FI hangs the row off the instance', async () => {
      (mockDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({
        id: 'fi_platform',
        customFrameworkId: null,
      });
      (mockDb.customRequirement.create as jest.Mock).mockResolvedValue({
        id: 'creq_new',
      });

      await service.createRequirement('fi_platform', 'org_A', {
        name: 'x',
        identifier: 'x',
        description: 'x',
      });

      expect(mockDb.customRequirement.create).toHaveBeenCalledWith({
        data: {
          name: 'x',
          identifier: 'x',
          description: 'x',
          organizationId: 'org_A',
          frameworkInstanceId: 'fi_platform',
        },
      });
    });
  });
});

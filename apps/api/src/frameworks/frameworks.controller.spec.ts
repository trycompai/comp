jest.mock('@db', () => ({
  db: {},
  FindingType: {
    soc2: 'soc2',
    iso27001: 'iso27001',
    hipaa: 'hipaa',
    gdpr: 'gdpr',
    nist: 'nist',
  },
  Frequency: {},
  Departments: {},
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  ac: { newRole: jest.fn() },
  createAccessControl: jest.fn(),
  adminAc: {},
  ownerAc: {},
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FrameworksController } from './frameworks.controller';
import { FrameworksService } from './frameworks.service';
import { FrameworkSyncService } from './framework-versioning/framework-sync.service';
import { FrameworkRollbackService } from './framework-versioning/framework-rollback.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

describe('FrameworksController', () => {
  let controller: FrameworksController;
  let service: jest.Mocked<FrameworksService>;
  let syncService: jest.Mocked<FrameworkSyncService>;
  let rollbackService: jest.Mocked<FrameworkRollbackService>;

  const mockService = {
    findAll: jest.fn(),
    findAvailable: jest.fn(),
    updateCustom: jest.fn(),
    delete: jest.fn(),
    getUpdateStatus: jest.fn(),
    getUpdatePreview: jest.fn(),
    getSyncHistory: jest.fn(),
  };

  const mockSyncService = {
    sync: jest.fn(),
  };

  const mockRollbackService = {
    rollback: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FrameworksController],
      providers: [
        { provide: FrameworksService, useValue: mockService },
        { provide: FrameworkSyncService, useValue: mockSyncService },
        { provide: FrameworkRollbackService, useValue: mockRollbackService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<FrameworksController>(FrameworksController);
    service = module.get(FrameworksService);
    syncService = module.get(FrameworkSyncService);
    rollbackService = module.get(FrameworkRollbackService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return framework instances with count', async () => {
      const mockData = [
        {
          id: 'fi1',
          frameworkId: 'f1',
          framework: { id: 'f1', name: 'ISO 27001' },
        },
        {
          id: 'fi2',
          frameworkId: 'f2',
          framework: { id: 'f2', name: 'SOC 2' },
        },
      ];
      mockService.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll('org_1');

      expect(result).toEqual({ data: mockData, count: 2 });
      expect(service.findAll).toHaveBeenCalledWith('org_1', { includeControls: false, includeScores: false });
    });

    it('should return empty list when no frameworks', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll('org_1');

      expect(result).toEqual({ data: [], count: 0 });
    });
  });

  describe('findAvailable', () => {
    // Regression test for the onboarding 500 bug: this endpoint must not throw
    // when the authenticated user has no active organization yet (fresh signups
    // hitting the first onboarding step). Previously used @OrganizationId(),
    // which threw when organizationId was empty → HTTP 500.
    it('should return frameworks when user has no active organization', async () => {
      const mockFrameworks = [
        { id: 'frk_1', name: 'soc2', visible: true, isCustom: false },
      ];
      mockService.findAvailable.mockResolvedValue(mockFrameworks);

      const result = await controller.findAvailable(undefined);

      expect(result).toEqual({ data: mockFrameworks, count: 1 });
      expect(service.findAvailable).toHaveBeenCalledWith(undefined);
    });

    it('should pass organizationId to service when user has an active org', async () => {
      mockService.findAvailable.mockResolvedValue([]);

      await controller.findAvailable('org_1');

      expect(service.findAvailable).toHaveBeenCalledWith('org_1');
    });
  });

  describe('delete', () => {
    it('should delegate to service and return result', async () => {
      mockService.delete.mockResolvedValue({ success: true });

      const result = await controller.delete('org_1', 'fi1');

      expect(result).toEqual({ success: true });
      expect(service.delete).toHaveBeenCalledWith('fi1', 'org_1');
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException('Framework instance not found'),
      );

      await expect(controller.delete('org_1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCustom', () => {
    it('should delegate to service and return the updated framework', async () => {
      const updated = { id: 'cfrm_A', name: 'CSC/CPRT' };
      mockService.updateCustom.mockResolvedValue(updated);

      const dto = { name: 'CSC/CPRT', description: 'Renamed' };
      const result = await controller.updateCustom('org_1', 'fi1', dto);

      expect(result).toEqual(updated);
      expect(service.updateCustom).toHaveBeenCalledWith('fi1', 'org_1', dto);
    });
  });

  describe('getUpdateStatus', () => {
    it('should return update status with { data }', async () => {
      const mockStatus = {
        currentVersion: { id: 'fvr_1', version: '1.0.0' },
        latestVersion: { id: 'fvr_2', version: '2.0.0', publishedAt: new Date(), releaseNotes: null },
        updateAvailable: true,
      };
      mockService.getUpdateStatus.mockResolvedValue(mockStatus);

      const result = await controller.getUpdateStatus('org_1', 'fi_1');

      expect(result).toEqual({ data: mockStatus });
      expect(service.getUpdateStatus).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkInstanceId: 'fi_1',
      });
    });

    it('should propagate NotFoundException when instance not found', async () => {
      mockService.getUpdateStatus.mockRejectedValue(
        new NotFoundException('Framework instance not found'),
      );

      await expect(controller.getUpdateStatus('org_1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUpdatePreview', () => {
    it('should return update preview with { data }', async () => {
      const mockPreview = {
        fromVersion: { id: 'fvr_1', version: '1.0.0' },
        toVersion: { id: 'fvr_2', version: '2.0.0' },
        releaseNotes: 'New features',
        controls: { added: [], archived: [], updatedApplied: [], updatedPreserved: [] },
        tasks: { added: [], archived: [], updatedApplied: [], updatedPreserved: [] },
        policies: { added: [], archived: [], updatedApplied: [], updatedPreserved: [], draftAddedForPublished: [] },
        requirements: { added: [], removed: [], updated: [] },
      };
      mockService.getUpdatePreview.mockResolvedValue(mockPreview);

      const result = await controller.getUpdatePreview('org_1', 'fi_1');

      expect(result).toEqual({ data: mockPreview });
      expect(service.getUpdatePreview).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkInstanceId: 'fi_1',
      });
    });

    it('should propagate NotFoundException when no update available', async () => {
      mockService.getUpdatePreview.mockRejectedValue(
        new NotFoundException('No update available'),
      );

      await expect(controller.getUpdatePreview('org_1', 'fi_1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncFramework', () => {
    const mockAuthContext = { userId: 'usr_1', organizationId: 'org_1' };

    it('should delegate to syncService and return { data: result }', async () => {
      const mockResult = { kind: 'synced', frameworkInstanceId: 'fi_1', syncOperationId: 'fso_1' };
      mockSyncService.sync.mockResolvedValue(mockResult);

      const result = await controller.syncFramework(
        'org_1',
        'fi_1',
        { targetVersionId: 'fvr_2' },
        mockAuthContext as never,
      );

      expect(result).toEqual({ data: mockResult });
      expect(syncService.sync).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkInstanceId: 'fi_1',
        targetVersionId: 'fvr_2',
        userId: 'usr_1',
      });
    });

    it('should return no-op result when already on target version', async () => {
      const mockResult = { kind: 'no-op', frameworkInstanceId: 'fi_1' };
      mockSyncService.sync.mockResolvedValue(mockResult);

      const result = await controller.syncFramework(
        'org_1',
        'fi_1',
        { targetVersionId: 'fvr_1' },
        mockAuthContext as never,
      );

      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('rollbackFramework', () => {
    const mockAuthContext = { userId: 'usr_1', organizationId: 'org_1' };

    it('should delegate to rollbackService and return { data: result }', async () => {
      const mockResult = { rollbackOperationId: 'fso_rb_1' };
      mockRollbackService.rollback.mockResolvedValue(mockResult);

      const result = await controller.rollbackFramework(
        'org_1',
        'fi_1',
        { syncOperationId: 'fso_1' },
        mockAuthContext as never,
      );

      expect(result).toEqual({ data: mockResult });
      expect(rollbackService.rollback).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkInstanceId: 'fi_1',
        syncOperationId: 'fso_1',
        userId: 'usr_1',
      });
    });

    it('should propagate NotFoundException when sync op not found', async () => {
      mockRollbackService.rollback.mockRejectedValue(
        new NotFoundException('Sync operation not found'),
      );

      await expect(
        controller.rollbackFramework('org_1', 'fi_1', { syncOperationId: 'fso_missing' }, mockAuthContext as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSyncHistory', () => {
    it('should return sync history with count', async () => {
      const mockHistory = [
        {
          id: 'fso_1',
          kind: 'SYNC',
          performedAt: new Date(),
          performedById: 'usr_1',
          rollbackExpiresAt: null,
          rolledBackByOperationId: null,
          fromVersion: { id: 'fvr_1', version: '1.0.0' },
          toVersion: { id: 'fvr_2', version: '2.0.0' },
          summary: null,
        },
      ];
      mockService.getSyncHistory.mockResolvedValue(mockHistory);

      const result = await controller.getSyncHistory('org_1', 'fi_1');

      expect(result).toEqual({ data: mockHistory, count: 1 });
      expect(service.getSyncHistory).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkInstanceId: 'fi_1',
      });
    });

    it('should return empty list with count 0 when no history', async () => {
      mockService.getSyncHistory.mockResolvedValue([]);

      const result = await controller.getSyncHistory('org_1', 'fi_1');

      expect(result).toEqual({ data: [], count: 0 });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RisksController } from './risks.controller';
import { RisksService } from './risks.service';
import {
  orgId,
  authContext,
  authContextNoUser,
  authenticatedUser,
  mockRisk,
  mockRiskBase,
  paginatedResult,
  statsData,
  deptStats,
  createDto,
  deleteResult,
} from './risks.controller.spec.fixtures';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('@trycompai/auth', () => ({
  statement: { risk: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));
jest.mock('../utils/assignment-filter', () => ({
  buildRiskAssignmentFilter: jest.fn().mockReturnValue({}),
  hasRiskAccess: jest.fn().mockReturnValue(true),
}));

import { buildRiskAssignmentFilter, hasRiskAccess } from '../utils/assignment-filter';

const mockBuildFilter = buildRiskAssignmentFilter as jest.MockedFunction<typeof buildRiskAssignmentFilter>;
const mockHasAccess = hasRiskAccess as jest.MockedFunction<typeof hasRiskAccess>;

describe('RisksController', () => {
  let controller: RisksController;
  let svc: jest.Mocked<RisksService>;

  beforeEach(async () => {
    const mockService = {
      findAllByOrganization: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      getStatsByAssignee: jest.fn(),
      getStatsByDepartment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RisksController],
      providers: [{ provide: RisksService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RisksController>(RisksController);
    svc = module.get(RisksService) as jest.Mocked<RisksService>;

    jest.clearAllMocks();
    mockBuildFilter.mockReturnValue({});
    mockHasAccess.mockReturnValue(true);
  });

  describe('getAllRisks', () => {
    it('should call findAllByOrganization with correct parameters', async () => {
      svc.findAllByOrganization.mockResolvedValue(paginatedResult);
      const query = { page: 1, perPage: 10 };

      await controller.getAllRisks(query, orgId, authContext);

      expect(mockBuildFilter).toHaveBeenCalledWith(
        authContext.memberId,
        authContext.userRoles,
        { isApiKey: false },
      );
      expect(svc.findAllByOrganization).toHaveBeenCalledWith(orgId, {}, query);
    });

    it('should return paginated data with auth info', async () => {
      svc.findAllByOrganization.mockResolvedValue(paginatedResult);

      const result = await controller.getAllRisks({}, orgId, authContext);

      expect(result).toEqual({
        ...paginatedResult,
        authType: 'session',
        authenticatedUser,
      });
    });

    it('should omit authenticatedUser when userId is not present', async () => {
      svc.findAllByOrganization.mockResolvedValue(paginatedResult);

      const result = await controller.getAllRisks({}, orgId, authContextNoUser);

      expect(result.authType).toBe('api-key');
      expect(result).not.toHaveProperty('authenticatedUser');
    });

    it('should pass assignment filter from buildRiskAssignmentFilter', async () => {
      const filter = { assigneeId: 'mem_123' };
      mockBuildFilter.mockReturnValue(filter);
      svc.findAllByOrganization.mockResolvedValue(paginatedResult);

      await controller.getAllRisks({}, orgId, authContext);

      expect(svc.findAllByOrganization).toHaveBeenCalledWith(
        orgId,
        filter,
        {},
      );
    });
  });

  describe('getStatsByAssignee', () => {
    it('should call getStatsByAssignee with organizationId', async () => {
      svc.getStatsByAssignee.mockResolvedValue(statsData);
      await controller.getStatsByAssignee(orgId, authContext);
      expect(svc.getStatsByAssignee).toHaveBeenCalledWith(orgId);
    });

    it('should return data with auth info', async () => {
      svc.getStatsByAssignee.mockResolvedValue(statsData);
      const result = await controller.getStatsByAssignee(orgId, authContext);
      expect(result).toEqual({
        data: statsData,
        authType: 'session',
        authenticatedUser,
      });
    });

    it('should omit authenticatedUser for API key auth', async () => {
      svc.getStatsByAssignee.mockResolvedValue(statsData);
      const result = await controller.getStatsByAssignee(
        orgId,
        authContextNoUser,
      );
      expect(result).not.toHaveProperty('authenticatedUser');
    });
  });

  describe('getStatsByDepartment', () => {
    it('should call getStatsByDepartment with organizationId', async () => {
      svc.getStatsByDepartment.mockResolvedValue(deptStats);
      await controller.getStatsByDepartment(orgId, authContext);
      expect(svc.getStatsByDepartment).toHaveBeenCalledWith(orgId);
    });

    it('should return data with auth info', async () => {
      svc.getStatsByDepartment.mockResolvedValue(deptStats);
      const result = await controller.getStatsByDepartment(orgId, authContext);
      expect(result).toEqual({
        data: deptStats,
        authType: 'session',
        authenticatedUser,
      });
    });
  });

  describe('getRiskById', () => {
    it('should call findById with correct parameters', async () => {
      svc.findById.mockResolvedValue(mockRisk);
      await controller.getRiskById('risk_1', orgId, authContext);
      expect(svc.findById).toHaveBeenCalledWith('risk_1', orgId);
    });

    it('should return risk with auth info', async () => {
      svc.findById.mockResolvedValue(mockRisk);
      const result = await controller.getRiskById('risk_1', orgId, authContext);
      expect(result).toEqual({
        ...mockRisk,
        authType: 'session',
        authenticatedUser,
      });
    });

    it('should throw ForbiddenException if access denied', async () => {
      svc.findById.mockResolvedValue(mockRisk);
      mockHasAccess.mockReturnValue(false);

      await expect(
        controller.getRiskById('risk_1', orgId, authContext),
      ).rejects.toThrow(ForbiddenException);

      expect(mockHasAccess).toHaveBeenCalledWith(
        mockRisk,
        authContext.memberId,
        authContext.userRoles,
        { isApiKey: false },
      );
    });

    it('should pass isApiKey option to hasRiskAccess', async () => {
      svc.findById.mockResolvedValue(mockRisk);
      await controller.getRiskById('risk_1', orgId, authContextNoUser);
      expect(mockHasAccess).toHaveBeenCalledWith(
        mockRisk,
        authContextNoUser.memberId,
        authContextNoUser.userRoles,
        { isApiKey: true },
      );
    });
  });

  describe('createRisk', () => {
    it('should call create with organizationId and dto', async () => {
      svc.create.mockResolvedValue(mockRiskBase);
      await controller.createRisk(createDto, orgId, authContext);
      expect(svc.create).toHaveBeenCalledWith(orgId, createDto);
    });

    it('should return created risk with auth info', async () => {
      svc.create.mockResolvedValue(mockRiskBase);
      const result = await controller.createRisk(createDto, orgId, authContext);
      expect(result).toEqual({
        ...mockRiskBase,
        authType: 'session',
        authenticatedUser,
      });
    });

    it('should omit authenticatedUser for API key auth', async () => {
      svc.create.mockResolvedValue(mockRiskBase);
      const result = await controller.createRisk(
        createDto,
        orgId,
        authContextNoUser,
      );
      expect(result).not.toHaveProperty('authenticatedUser');
      expect(result.authType).toBe('api-key');
    });
  });

  describe('updateRisk', () => {
    const updateDto = { title: 'Updated Risk' };
    const updatedRisk = { ...mockRiskBase, title: 'Updated Risk' };

    it('should call updateById with correct parameters', async () => {
      svc.updateById.mockResolvedValue(updatedRisk);
      await controller.updateRisk('risk_1', updateDto, orgId, authContext);
      expect(svc.updateById).toHaveBeenCalledWith('risk_1', orgId, updateDto);
    });

    it('should return updated risk with auth info', async () => {
      svc.updateById.mockResolvedValue(updatedRisk);
      const result = await controller.updateRisk(
        'risk_1',
        updateDto,
        orgId,
        authContext,
      );
      expect(result).toEqual({
        ...updatedRisk,
        authType: 'session',
        authenticatedUser,
      });
    });
  });

  describe('deleteRisk', () => {
    it('should call deleteById with correct parameters', async () => {
      svc.deleteById.mockResolvedValue(deleteResult);
      await controller.deleteRisk('risk_1', orgId, authContext);
      expect(svc.deleteById).toHaveBeenCalledWith('risk_1', orgId);
    });

    it('should return delete result with auth info', async () => {
      svc.deleteById.mockResolvedValue(deleteResult);
      const result = await controller.deleteRisk('risk_1', orgId, authContext);
      expect(result).toEqual({
        ...deleteResult,
        authType: 'session',
        authenticatedUser,
      });
    });

    it('should omit authenticatedUser for API key auth', async () => {
      svc.deleteById.mockResolvedValue(deleteResult);
      const result = await controller.deleteRisk(
        'risk_1',
        orgId,
        authContextNoUser,
      );
      expect(result).not.toHaveProperty('authenticatedUser');
    });
  });
});

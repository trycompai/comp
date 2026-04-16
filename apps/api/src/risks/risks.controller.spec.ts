import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import type { AuthContext } from '../auth/types';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RisksController } from './risks.controller';
import { RisksService } from './risks.service';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('@db', () => ({
  ...jest.requireActual('@prisma/client'),
  db: {},
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));

jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    risk: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('../utils/assignment-filter', () => ({
  buildRiskAssignmentFilter: jest.fn().mockReturnValue({}),
  hasRiskAccess: jest.fn().mockReturnValue(true),
}));

import {
  buildRiskAssignmentFilter,
  hasRiskAccess,
} from '../utils/assignment-filter';
import { RiskCategory } from '@db';

const mockBuildRiskAssignmentFilter =
  buildRiskAssignmentFilter as jest.MockedFunction<
    typeof buildRiskAssignmentFilter
  >;
const mockHasRiskAccess = hasRiskAccess as jest.MockedFunction<
  typeof hasRiskAccess
>;

describe('RisksController', () => {
  let controller: RisksController;
  let risksService: jest.Mocked<RisksService>;

  const orgId = 'org_test123';

  const authContext: AuthContext = {
    organizationId: orgId,
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userRoles: ['admin'],
    userId: 'usr_123',
    userEmail: 'admin@example.com',
    memberId: 'mem_123',
  };

  const authContextNoUser: AuthContext = {
    organizationId: orgId,
    authType: 'api-key',
    isApiKey: true,
    isPlatformAdmin: false,
    userRoles: ['admin'],
    userId: undefined,
    userEmail: undefined,
    memberId: undefined,
  };

  const mockRisk = {
    id: 'risk_1',
    title: 'Test Risk',
    description: 'A test risk',
    status: 'open',
    category: 'operational',
    department: 'engineering',
    organizationId: orgId,
    assigneeId: 'mem_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
    risksService = module.get(RisksService);

    jest.clearAllMocks();
    mockBuildRiskAssignmentFilter.mockReturnValue({});
    mockHasRiskAccess.mockReturnValue(true);
  });

  describe('getAllRisks', () => {
    const paginatedResult = {
      data: [mockRisk],
      totalCount: 1,
      page: 1,
      pageCount: 1,
    };

    it('should call findAllByOrganization with correct parameters', async () => {
      risksService.findAllByOrganization.mockResolvedValue(
        paginatedResult as unknown as Awaited<
          ReturnType<typeof risksService.findAllByOrganization>
        >,
      );
      const query = { page: 1, perPage: 10 };

      await controller.getAllRisks(query, orgId, authContext);

      expect(mockBuildRiskAssignmentFilter).toHaveBeenCalledWith(
        authContext.memberId,
        authContext.userRoles,
        { isApiKey: false },
      );
      expect(risksService.findAllByOrganization).toHaveBeenCalledWith(
        orgId,
        {},
        query,
      );
    });

    it('should return paginated data with auth info', async () => {
      risksService.findAllByOrganization.mockResolvedValue(
        paginatedResult as unknown as Awaited<
          ReturnType<typeof risksService.findAllByOrganization>
        >,
      );

      const result = await controller.getAllRisks({}, orgId, authContext);

      expect(result).toEqual({
        data: paginatedResult.data,
        totalCount: 1,
        page: 1,
        pageCount: 1,
        authType: 'session',
        authenticatedUser: {
          id: 'usr_123',
          email: 'admin@example.com',
        },
      });
    });

    it('should omit authenticatedUser when userId is not present', async () => {
      risksService.findAllByOrganization.mockResolvedValue(
        paginatedResult as unknown as Awaited<
          ReturnType<typeof risksService.findAllByOrganization>
        >,
      );

      const result = await controller.getAllRisks({}, orgId, authContextNoUser);

      expect(result.authType).toBe('api-key');
      expect(result).not.toHaveProperty('authenticatedUser');
    });

    it('should pass assignment filter from buildRiskAssignmentFilter', async () => {
      const assignmentFilter = { assigneeId: 'mem_123' };
      mockBuildRiskAssignmentFilter.mockReturnValue(assignmentFilter);
      risksService.findAllByOrganization.mockResolvedValue(
        paginatedResult as unknown as Awaited<
          ReturnType<typeof risksService.findAllByOrganization>
        >,
      );

      await controller.getAllRisks({}, orgId, authContext);

      expect(risksService.findAllByOrganization).toHaveBeenCalledWith(
        orgId,
        assignmentFilter,
        {},
      );
    });
  });

  describe('getStatsByAssignee', () => {
    const statsData = [
      {
        id: 'mem_1',
        user: { name: 'User 1', image: null, email: 'u1@test.com' },
        totalRisks: 3,
        openRisks: 1,
        pendingRisks: 1,
        closedRisks: 1,
        archivedRisks: 0,
      },
    ];

    it('should call getStatsByAssignee with organizationId', async () => {
      risksService.getStatsByAssignee.mockResolvedValue(statsData);

      await controller.getStatsByAssignee(orgId, authContext);

      expect(risksService.getStatsByAssignee).toHaveBeenCalledWith(orgId);
    });

    it('should return data with auth info', async () => {
      risksService.getStatsByAssignee.mockResolvedValue(statsData);

      const result = await controller.getStatsByAssignee(orgId, authContext);

      expect(result).toEqual({
        data: statsData,
        authType: 'session',
        authenticatedUser: {
          id: 'usr_123',
          email: 'admin@example.com',
        },
      });
    });

    it('should omit authenticatedUser for API key auth', async () => {
      risksService.getStatsByAssignee.mockResolvedValue(statsData);

      const result = await controller.getStatsByAssignee(
        orgId,
        authContextNoUser,
      );

      expect(result).not.toHaveProperty('authenticatedUser');
    });
  });

  describe('getStatsByDepartment', () => {
    const deptStats = [
      { department: 'engineering', _count: 5 },
      { department: 'finance', _count: 3 },
    ];

    it('should call getStatsByDepartment with organizationId', async () => {
      risksService.getStatsByDepartment.mockResolvedValue(
        deptStats as unknown as Awaited<
          ReturnType<typeof risksService.getStatsByDepartment>
        >,
      );

      await controller.getStatsByDepartment(orgId, authContext);

      expect(risksService.getStatsByDepartment).toHaveBeenCalledWith(orgId);
    });

    it('should return data with auth info', async () => {
      risksService.getStatsByDepartment.mockResolvedValue(
        deptStats as unknown as Awaited<
          ReturnType<typeof risksService.getStatsByDepartment>
        >,
      );

      const result = await controller.getStatsByDepartment(orgId, authContext);

      expect(result).toEqual({
        data: deptStats,
        authType: 'session',
        authenticatedUser: {
          id: 'usr_123',
          email: 'admin@example.com',
        },
      });
    });
  });

  describe('getRiskById', () => {
    it('should call findById with correct parameters', async () => {
      risksService.findById.mockResolvedValue(
        mockRisk as unknown as Awaited<
          ReturnType<typeof risksService.findById>
        >,
      );

      await controller.getRiskById('risk_1', orgId, authContext);

      expect(risksService.findById).toHaveBeenCalledWith('risk_1', orgId);
    });

    it('should return risk with auth info', async () => {
      risksService.findById.mockResolvedValue(
        mockRisk as unknown as Awaited<
          ReturnType<typeof risksService.findById>
        >,
      );

      const result = await controller.getRiskById('risk_1', orgId, authContext);

      expect(result).toEqual({
        ...mockRisk,
        authType: 'session',
        authenticatedUser: {
          id: 'usr_123',
          email: 'admin@example.com',
        },
      });
    });

    it('should check hasRiskAccess and throw ForbiddenException if denied', async () => {
      risksService.findById.mockResolvedValue(
        mockRisk as unknown as Awaited<
          ReturnType<typeof risksService.findById>
        >,
      );
      mockHasRiskAccess.mockReturnValue(false);

      await expect(
        controller.getRiskById('risk_1', orgId, authContext),
      ).rejects.toThrow(ForbiddenException);

      expect(mockHasRiskAccess).toHaveBeenCalledWith(
        mockRisk,
        authContext.memberId,
        authContext.userRoles,
        { isApiKey: false },
      );
    });

    it('should pass isApiKey option to hasRiskAccess', async () => {
      risksService.findById.mockResolvedValue(
        mockRisk as unknown as Awaited<
          ReturnType<typeof risksService.findById>
        >,
      );

      await controller.getRiskById('risk_1', orgId, authContextNoUser);

      expect(mockHasRiskAccess).toHaveBeenCalledWith(
        mockRisk,
        authContextNoUser.memberId,
        authContextNoUser.userRoles,
        { isApiKey: true },
      );
    });
  });

  describe('createRisk', () => {
    const createDto = {
      title: 'New Risk',
      description: 'Description',
      category: RiskCategory.operational,
    };

    it('should call create with organizationId and dto', async () => {
      risksService.create.mockResolvedValue(
        mockRisk as unknown as Awaited<ReturnType<typeof risksService.create>>,
      );

      await controller.createRisk(createDto, orgId, authContext);

      expect(risksService.create).toHaveBeenCalledWith(orgId, createDto);
    });

    it('should return created risk with auth info', async () => {
      risksService.create.mockResolvedValue(
        mockRisk as unknown as Awaited<ReturnType<typeof risksService.create>>,
      );

      const result = await controller.createRisk(createDto, orgId, authContext);

      expect(result).toEqual({
        ...mockRisk,
        authType: 'session',
        authenticatedUser: {
          id: 'usr_123',
          email: 'admin@example.com',
        },
      });
    });

    it('should omit authenticatedUser for API key auth', async () => {
      risksService.create.mockResolvedValue(
        mockRisk as unknown as Awaited<ReturnType<typeof risksService.create>>,
      );

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
    const updatedRisk = { ...mockRisk, title: 'Updated Risk' };

    it('should call updateById with correct parameters', async () => {
      risksService.updateById.mockResolvedValue(
        updatedRisk as unknown as Awaited<
          ReturnType<typeof risksService.updateById>
        >,
      );

      await controller.updateRisk('risk_1', updateDto, orgId, authContext);

      expect(risksService.updateById).toHaveBeenCalledWith(
        'risk_1',
        orgId,
        updateDto,
      );
    });

    it('should return updated risk with auth info', async () => {
      risksService.updateById.mockResolvedValue(
        updatedRisk as unknown as Awaited<
          ReturnType<typeof risksService.updateById>
        >,
      );

      const result = await controller.updateRisk(
        'risk_1',
        updateDto,
        orgId,
        authContext,
      );

      expect(result).toEqual({
        ...updatedRisk,
        authType: 'session',
        authenticatedUser: {
          id: 'usr_123',
          email: 'admin@example.com',
        },
      });
    });
  });

  describe('deleteRisk', () => {
    const deleteResult = {
      message: 'Risk deleted successfully',
      deletedRisk: { id: 'risk_1', title: 'Test Risk' },
    };

    it('should call deleteById with correct parameters', async () => {
      risksService.deleteById.mockResolvedValue(deleteResult);

      await controller.deleteRisk('risk_1', orgId, authContext);

      expect(risksService.deleteById).toHaveBeenCalledWith('risk_1', orgId);
    });

    it('should return delete result with auth info', async () => {
      risksService.deleteById.mockResolvedValue(deleteResult);

      const result = await controller.deleteRisk('risk_1', orgId, authContext);

      expect(result).toEqual({
        ...deleteResult,
        authType: 'session',
        authenticatedUser: {
          id: 'usr_123',
          email: 'admin@example.com',
        },
      });
    });

    it('should omit authenticatedUser for API key auth', async () => {
      risksService.deleteById.mockResolvedValue(deleteResult);

      const result = await controller.deleteRisk(
        'risk_1',
        orgId,
        authContextNoUser,
      );

      expect(result).not.toHaveProperty('authenticatedUser');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext as AuthContextType } from '../auth/types';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    app: ['read'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

const mockFindMany = jest.fn();
jest.mock('@db', () => ({
  db: {
    auditLog: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
  Prisma: {},
}));

describe('AuditLogController', () => {
  let controller: AuditLogController;

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContextType = {
    authType: 'session' as const,
    userId: 'usr_1',
    userEmail: 'user@example.com',
    organizationId: 'org_1',
    memberId: 'mem_1',
    isApiKey: false,
    isPlatformAdmin: false,
    userRoles: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<AuditLogController>(AuditLogController);

    jest.clearAllMocks();
  });

  describe('getAuditLogs', () => {
    it('should return logs with default take of 50', async () => {
      const mockLogs = [{ id: 'log_1' }, { id: 'log_2' }];
      mockFindMany.mockResolvedValue(mockLogs);

      const result = await controller.getAuditLogs('org_1', mockAuthContext);

      expect(result).toEqual({
        data: mockLogs,
        authType: 'session',
        authenticatedUser: { id: 'usr_1', email: 'user@example.com' },
      });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
          member: true,
          organization: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    });

    it('should filter by single entityType', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.getAuditLogs('org_1', mockAuthContext, 'policy');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_1', entityType: 'policy' },
        }),
      );
    });

    it('should filter by multiple comma-separated entityTypes', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.getAuditLogs('org_1', mockAuthContext, 'risk,task');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org_1',
            entityType: { in: ['risk', 'task'] },
          },
        }),
      );
    });

    it('should filter by single entityId', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.getAuditLogs(
        'org_1',
        mockAuthContext,
        undefined,
        'ent_1',
      );

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_1', entityId: 'ent_1' },
        }),
      );
    });

    it('should filter by multiple comma-separated entityIds', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.getAuditLogs(
        'org_1',
        mockAuthContext,
        undefined,
        'ent_1,ent_2',
      );

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org_1',
            entityId: { in: ['ent_1', 'ent_2'] },
          },
        }),
      );
    });

    it('should filter by pathContains', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.getAuditLogs(
        'org_1',
        mockAuthContext,
        undefined,
        undefined,
        'auto_123',
      );

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org_1',
            data: {
              path: ['path'],
              string_contains: 'auto_123',
            },
          },
        }),
      );
    });

    it('should respect custom take parameter capped at 100', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.getAuditLogs(
        'org_1',
        mockAuthContext,
        undefined,
        undefined,
        undefined,
        '200',
      );

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should clamp take to minimum of 1', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.getAuditLogs(
        'org_1',
        mockAuthContext,
        undefined,
        undefined,
        undefined,
        '-5',
      );

      // parseInt('-5') = -5, Math.max(1, -5) = 1
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('should default take to 50 for invalid take values', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.getAuditLogs(
        'org_1',
        mockAuthContext,
        undefined,
        undefined,
        undefined,
        'invalid',
      );

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should not include authenticatedUser when userId is absent', async () => {
      mockFindMany.mockResolvedValue([]);

      const authContextNoUser: AuthContextType = {
        authType: 'api-key' as const,
        organizationId: 'org_1',
        isApiKey: true,
        isPlatformAdmin: false,
        userRoles: null,
      };

      const result = await controller.getAuditLogs('org_1', authContextNoUser);

      expect(result).toEqual({
        data: [],
        authType: 'api-key',
      });
    });
  });
});

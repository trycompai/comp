import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard, PERMISSIONS_KEY } from './permission.guard';

// Mock auth.server to provide auth.api.hasPermission
const mockHasPermission = jest.fn();
jest.mock('./auth.server', () => ({
  auth: {
    api: {
      hasPermission: (...args: unknown[]) => mockHasPermission(...args),
    },
  },
}));

// Mock @trycompai/auth to avoid ESM issues with better-auth
jest.mock('@trycompai/auth', () => ({
  RESTRICTED_ROLES: ['employee', 'contractor'],
  PRIVILEGED_ROLES: ['owner', 'admin', 'auditor'],
}));

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (
    request: Partial<{
      isApiKey: boolean;
      apiKeyScopes: string[] | undefined;
      userRoles: string[] | null;
      headers: Record<string, string>;
      organizationId: string;
      method: string;
      url: string;
    }>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          isApiKey: false,
          apiKeyScopes: undefined,
          userRoles: null,
          headers: {},
          organizationId: 'org_123',
          method: 'GET',
          url: '/v1/test',
          ...request,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionGuard, Reflector],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
    mockHasPermission.mockReset();
  });

  describe('canActivate', () => {
    it('should allow access when no permissions are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext({});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access for legacy API keys with empty scopes before deprecation date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-19T23:59:59Z'));

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['delete'] }]);

      const context = createMockExecutionContext({
        isApiKey: true,
        apiKeyScopes: [],
        method: 'GET',
        url: '/v1/controls',
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);

      jest.useRealTimers();
    });

    it('should deny access for legacy API keys with empty scopes after deprecation date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-20T00:00:00Z'));

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['read'] }]);

      const context = createMockExecutionContext({
        isApiKey: true,
        apiKeyScopes: [],
        method: 'GET',
        url: '/v1/controls',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      jest.useRealTimers();
    });

    it('should deny access for legacy API keys with undefined scopes after deprecation date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-01T00:00:00Z'));

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['read'] }]);

      const context = createMockExecutionContext({
        isApiKey: true,
        apiKeyScopes: undefined,
        method: 'GET',
        url: '/v1/controls',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      jest.useRealTimers();
    });

    it('should allow access for API keys with matching scopes', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['read'] }]);

      const context = createMockExecutionContext({
        isApiKey: true,
        apiKeyScopes: ['control:read'],
        method: 'GET',
        url: '/v1/controls',
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access for API keys with non-matching scopes', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['read'] }]);

      const context = createMockExecutionContext({
        isApiKey: true,
        apiKeyScopes: ['risk:read'],
        method: 'GET',
        url: '/v1/controls',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deny access when no authorization or cookie header present', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['delete'] }]);

      const context = createMockExecutionContext({
        headers: {},
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access when SDK returns success', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['delete'] }]);

      mockHasPermission.mockResolvedValue({ success: true, error: null });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer token' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockHasPermission).toHaveBeenCalledWith({
        headers: expect.any(Headers),
        body: {
          permissions: { control: ['delete'] },
        },
      });
    });

    it('should deny access when SDK returns failure', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['delete'] }]);

      mockHasPermission.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deny access when SDK throws', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['delete'] }]);

      mockHasPermission.mockRejectedValue(new Error('SDK error'));

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('isRestrictedRole', () => {
    it('should return true for employee role', () => {
      expect(PermissionGuard.isRestrictedRole(['employee'])).toBe(true);
    });

    it('should return true for contractor role', () => {
      expect(PermissionGuard.isRestrictedRole(['contractor'])).toBe(true);
    });

    it('should return false for admin role', () => {
      expect(PermissionGuard.isRestrictedRole(['admin'])).toBe(false);
    });

    it('should return false for owner role', () => {
      expect(PermissionGuard.isRestrictedRole(['owner'])).toBe(false);
    });

    it('should return false for auditor role', () => {
      expect(PermissionGuard.isRestrictedRole(['auditor'])).toBe(false);
    });

    it('should return false if user has both employee and admin roles', () => {
      expect(PermissionGuard.isRestrictedRole(['employee', 'admin'])).toBe(
        false,
      );
    });

    it('should return true for null roles', () => {
      expect(PermissionGuard.isRestrictedRole(null)).toBe(true);
    });

    it('should return true for empty roles array', () => {
      expect(PermissionGuard.isRestrictedRole([])).toBe(true);
    });
  });
});

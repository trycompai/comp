import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PermissionGuard, PERMISSIONS_KEY } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const createMockExecutionContext = (
    request: Partial<{
      isApiKey: boolean;
      userRoles: string[] | null;
      headers: Record<string, string>;
      organizationId: string;
    }>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          isApiKey: false,
          userRoles: null,
          headers: {},
          organizationId: 'org_123',
          ...request,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        Reflector,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    it('should allow access when no permissions are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext({});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access for API keys (with warning)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        { resource: 'control', actions: ['delete'] },
      ]);

      const context = createMockExecutionContext({ isApiKey: true });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user has no roles', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        { resource: 'control', actions: ['delete'] },
      ]);

      // Mock fetch to fail so it uses fallback
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

      const context = createMockExecutionContext({
        userRoles: null,
        headers: { authorization: 'Bearer token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access for privileged roles in fallback mode', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        { resource: 'control', actions: ['delete'] },
      ]);

      // Mock fetch to fail so it uses fallback
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

      const context = createMockExecutionContext({
        userRoles: ['admin'],
        headers: { authorization: 'Bearer token' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access for restricted roles in fallback mode', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        { resource: 'control', actions: ['delete'] },
      ]);

      // Mock fetch to fail so it uses fallback
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

      const context = createMockExecutionContext({
        userRoles: ['employee'],
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

    it('should return false for program_manager role', () => {
      expect(PermissionGuard.isRestrictedRole(['program_manager'])).toBe(false);
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

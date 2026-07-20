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

// Mock ./app-access (used to authorize MCP OAuth requests and the portal
// fallback). Mocked here so the spec doesn't pull in @db via the real module;
// permissionsGrant/allPermissionsGranted use the real (trivial) logic so only
// the role-resolving functions need stubbing.
const mockResolveRolePermissions = jest.fn();
const mockResolveRolePermissionsWithImplicitPortal = jest.fn();
function permissionsGrant(
  perms: Record<string, string[]>,
  resource: string,
  action: string,
) {
  return perms?.[resource]?.includes(action) ?? false;
}
jest.mock('./app-access', () => ({
  resolveRolePermissions: (...args: unknown[]) =>
    mockResolveRolePermissions(...args),
  resolveRolePermissionsWithImplicitPortal: (...args: unknown[]) =>
    mockResolveRolePermissionsWithImplicitPortal(...args),
  permissionsGrant: (
    perms: Record<string, string[]>,
    resource: string,
    action: string,
  ) => permissionsGrant(perms, resource, action),
  allPermissionsGranted: (
    perms: Record<string, string[]>,
    required: Record<string, string[]>,
  ) =>
    Object.entries(required).every(([resource, actions]) =>
      actions.every((action) => permissionsGrant(perms, resource, action)),
    ),
}));

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (
    request: Partial<{
      isApiKey: boolean;
      isMcpOAuth: boolean;
      isPlatformAdmin: boolean;
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
    mockResolveRolePermissions.mockReset();
    mockResolveRolePermissionsWithImplicitPortal.mockReset();
  });

  describe('MCP OAuth authorization', () => {
    it('authorizes via resolved roles, not session hasPermission', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['read'] }]);
      mockResolveRolePermissions.mockResolvedValue({
        control: ['read', 'create'],
      });

      const context = createMockExecutionContext({
        isMcpOAuth: true,
        userRoles: ['admin'],
        organizationId: 'org_1',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      // Session-based hasPermission must NOT be used for MCP OAuth tokens.
      expect(mockHasPermission).not.toHaveBeenCalled();
      expect(mockResolveRolePermissions).toHaveBeenCalledWith('org_1', [
        'admin',
      ]);
    });

    it('denies MCP OAuth when resolved roles lack the permission', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['delete'] }]);
      mockResolveRolePermissions.mockResolvedValue({ control: ['read'] });

      const context = createMockExecutionContext({
        isMcpOAuth: true,
        userRoles: ['auditor'],
        organizationId: 'org_1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
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
      // The body MUST include `permission: undefined` explicitly — zod 4 in
      // better-auth's hasPermission schema requires both discriminated-union
      // keys to be present, and treats omitted-vs-undefined as different.
      // Without the explicit undefined, every cookie-authenticated request
      // 403s with "Unable to verify permissions". Pin this in the test so
      // a future refactor that drops the field gets caught.
      expect(mockHasPermission).toHaveBeenCalledWith({
        headers: expect.any(Headers),
        body: {
          permissions: { control: ['delete'] },
          permission: undefined,
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

  describe('portal fallback for custom roles', () => {
    it('grants portal access via the fallback when a custom role has no stored portal permission', async () => {
      // Reproduces the reported bug: a custom role (e.g. "DevOps Engineer")
      // has no 'portal' entry in its stored permissions because the
      // custom-role editor UI has no toggle for it, so better-auth's
      // hasPermission denies it — the guard must fall back and grant it.
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'portal', actions: ['update'] }]);

      mockHasPermission.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });
      mockResolveRolePermissionsWithImplicitPortal.mockResolvedValue({
        control: ['read'],
        portal: ['read', 'update'],
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer token' },
        userRoles: ['devops-engineer'],
        organizationId: 'org_1',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(mockResolveRolePermissionsWithImplicitPortal).toHaveBeenCalledWith(
        'org_1',
        ['devops-engineer'],
      );
    });

    it('does not invoke the fallback for non-portal permission requirements', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'control', actions: ['delete'] }]);

      mockHasPermission.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer token' },
        userRoles: ['devops-engineer'],
        organizationId: 'org_1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        mockResolveRolePermissionsWithImplicitPortal,
      ).not.toHaveBeenCalled();
    });

    it('still denies when the fallback resolution also lacks the required portal action', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'portal', actions: ['update'] }]);

      mockHasPermission.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });
      mockResolveRolePermissionsWithImplicitPortal.mockResolvedValue({
        portal: ['read'], // read only — 'update' still missing
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer token' },
        userRoles: ['read-only-custom-role'],
        organizationId: 'org_1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('does not invoke the fallback when userRoles is null (no roles resolved)', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([{ resource: 'portal', actions: ['read'] }]);

      mockHasPermission.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer token' },
        userRoles: null,
        organizationId: 'org_1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        mockResolveRolePermissionsWithImplicitPortal,
      ).not.toHaveBeenCalled();
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

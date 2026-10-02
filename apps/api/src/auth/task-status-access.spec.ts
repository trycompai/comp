const mockMemberFindFirst = jest.fn();
const mockResolveRolePermissions = jest.fn();

jest.mock('@db', () => ({
  db: {
    member: { findFirst: (...args: unknown[]) => mockMemberFindFirst(...args) },
  },
}));
jest.mock('./app-access', () => ({
  resolveRolePermissions: (...args: unknown[]) =>
    mockResolveRolePermissions(...args),
}));
jest.mock('./hybrid-auth.guard', () => ({ HybridAuthGuard: class {} }));
jest.mock('./permission.guard', () => ({
  PermissionGuard: class {},
  PERMISSIONS_KEY: 'permissions',
}));

import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import type { AuthContext } from './types';

const context = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  organizationId: 'org_1',
  authType: 'session',
  userId: 'usr_1',
  userRoles: ['admin'],
  isApiKey: false,
  isPlatformAdmin: false,
  ...overrides,
});

describe('AuthController.getTaskStatusAccess', () => {
  const controller = new AuthController();

  beforeEach(() => {
    jest.clearAllMocks();
    mockMemberFindFirst.mockResolvedValue({ role: 'auditor,custom-reader' });
    mockResolveRolePermissions.mockResolvedValue({ policy: ['read'] });
  });

  it('returns actual member permissions instead of session role claims', async () => {
    await expect(controller.getTaskStatusAccess(context())).resolves.toEqual({
      organizationId: 'org_1',
      permissions: { policy: ['read'] },
    });
    expect(mockMemberFindFirst).toHaveBeenCalledWith({
      where: {
        userId: 'usr_1',
        organizationId: 'org_1',
        isActive: true,
        deactivated: false,
      },
      select: { role: true },
    });
    expect(mockResolveRolePermissions).toHaveBeenCalledWith('org_1', [
      'auditor',
      'custom-reader',
    ]);
  });

  it.each(['deactivated', 'inactive', 'removed', 'foreign'])(
    'rejects a %s membership',
    async () => {
      mockMemberFindFirst.mockResolvedValue(null);
      await expect(controller.getTaskStatusAccess(context())).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockResolveRolePermissions).not.toHaveBeenCalled();
    },
  );

  it.each([
    { authType: 'api-key', isApiKey: true },
    { authType: 'service', isServiceToken: true },
    { userId: undefined },
    { organizationId: '' },
  ] satisfies Partial<AuthContext>[])(
    'rejects non-session or incomplete context: %j',
    async (override) => {
      await expect(
        controller.getTaskStatusAccess(context(override)),
      ).rejects.toThrow(ForbiddenException);
      expect(mockMemberFindFirst).not.toHaveBeenCalled();
    },
  );

  it('does not grant platform administrators membership or permission bypasses', async () => {
    mockMemberFindFirst.mockResolvedValue(null);
    await expect(
      controller.getTaskStatusAccess(context({ isPlatformAdmin: true })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fails closed for members with no role', async () => {
    mockMemberFindFirst.mockResolvedValue({ role: null });
    mockResolveRolePermissions.mockResolvedValue({});
    await expect(controller.getTaskStatusAccess(context())).resolves.toEqual({
      organizationId: 'org_1',
      permissions: {},
    });
    expect(mockResolveRolePermissions).toHaveBeenCalledWith('org_1', []);
  });
});

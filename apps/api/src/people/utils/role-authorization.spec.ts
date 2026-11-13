import { ForbiddenException } from '@nestjs/common';
import { authorizeRoleRestoration, toMemberActor } from './role-authorization';

jest.mock('@db', () => ({
  db: {
    member: { findFirst: jest.fn() },
    organizationRole: { findMany: jest.fn() },
  },
}));

jest.mock('@trycompai/auth', () => ({
  BUILT_IN_ROLE_PERMISSIONS: {
    owner: { member: ['create', 'read', 'update', 'delete'] },
    admin: { member: ['create', 'read', 'update', 'delete'] },
    auditor: { member: ['read'], app: ['read'] },
    employee: { portal: ['read'] },
    contractor: { portal: ['read'] },
  },
  isRestrictedRole: (role: string) =>
    role === 'employee' || role === 'contractor',
  parseRolePermissions: (value: unknown) =>
    typeof value === 'string' ? JSON.parse(value) : value,
}));

import { db } from '@db';

const ORG = 'org_123';
const TARGET = { id: 'mem_target', userId: 'usr_target', role: 'admin' };

const mockCaller = (role: string) => {
  (db.member.findFirst as jest.Mock).mockImplementation(
    (args: { where: { userId?: string; organizationId?: string } }) =>
      args?.where?.userId === 'usr_caller' &&
      args?.where?.organizationId === ORG
        ? Promise.resolve({ id: 'mem_caller', role })
        : Promise.resolve(null),
  );
};

const mockCustomRoles = (roles: Record<string, object>) => {
  (db.organizationRole.findMany as jest.Mock).mockImplementation(
    (args: { where: { name: { in: string[] } } }) =>
      Promise.resolve(
        args.where.name.in
          .filter((name) => Object.hasOwn(roles, name))
          .map((name) => ({
            name,
            permissions: JSON.stringify(roles[name]),
          })),
      ),
  );
};

const actor = { userId: 'usr_caller' };

describe('authorizeRoleRestoration — reinstatement is a role grant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomRoles({});
  });

  it('refuses a partial member:update caller restoring a stored admin', async () => {
    mockCaller('people-editor');
    mockCustomRoles({ 'people-editor': { member: ['read', 'update'] } });

    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: TARGET,
        actor,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses a partial caller restoring a custom role that exceeds their permissions', async () => {
    mockCaller('people-editor');
    mockCustomRoles({
      'people-editor': { member: ['read', 'update'] },
      'evidence-admin': { member: ['read'], evidence: ['read', 'update'] },
    });

    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: { ...TARGET, role: 'evidence-admin' },
        actor,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses an admin restoring a member who holds the owner role', async () => {
    mockCaller('admin');

    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: { ...TARGET, role: 'owner' },
        actor,
      }),
    ).rejects.toThrow(/owner role/);
  });

  it('refuses an API key holding only member:update from restoring a stored admin', async () => {
    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: TARGET,
        actor: { isApiKey: true, apiKeyScopes: ['member:update'] },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses any API key from restoring a member who holds owner', async () => {
    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: { ...TARGET, role: 'owner' },
        actor: {
          isApiKey: true,
          apiKeyScopes: [
            'member:create',
            'member:read',
            'member:update',
            'member:delete',
          ],
        },
      }),
    ).rejects.toThrow(/owner role/);
  });

  it('allows a full member:* API key to restore a stored admin', async () => {
    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: TARGET,
        actor: {
          isApiKey: true,
          apiKeyScopes: [
            'member:create',
            'member:read',
            'member:update',
            'member:delete',
          ],
        },
      }),
    ).resolves.toBeUndefined();
  });

  it('allows an admin to restore an employee', async () => {
    mockCaller('admin');

    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: { ...TARGET, role: 'employee' },
        actor,
      }),
    ).resolves.toBeUndefined();
  });

  it('allows an owner to restore a stored admin', async () => {
    mockCaller('owner');

    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: TARGET,
        actor,
      }),
    ).resolves.toBeUndefined();
  });

  it('refuses a caller who is not a member of the organization', async () => {
    (db.member.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      authorizeRoleRestoration({
        organizationId: ORG,
        targetMember: { ...TARGET, role: 'employee' },
        actor,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('builds the actor from an auth context', () => {
    expect(
      toMemberActor({
        userId: 'usr_caller',
        userRoles: ['admin'],
        isApiKey: false,
      }),
    ).toEqual({
      userId: 'usr_caller',
      roles: ['admin'],
      isApiKey: false,
      apiKeyScopes: undefined,
    });
  });
});

/**
 * Portal access matrix tests.
 *
 * Verifies which role combinations grant portal access, matching the
 * logic in apps/portal/src/utils/portal-access.ts. Tests the pure
 * built-in role resolution — custom roles require DB and are tested
 * separately in integration tests.
 */

jest.mock('better-auth', () => ({ betterAuth: jest.fn() }));
jest.mock('better-auth/adapters/prisma', () => ({ prismaAdapter: jest.fn() }));
jest.mock('better-auth/plugins', () => ({
  bearer: jest.fn(),
  emailOTP: jest.fn(),
  jwt: jest.fn(),
  magicLink: jest.fn(),
  multiSession: jest.fn(),
  organization: jest.fn(),
}));
jest.mock('better-auth/plugins/access', () => ({
  createAccessControl: (stmt: Record<string, readonly string[]>) => ({
    newRole: (statements: Record<string, readonly string[]>) => ({
      statements,
    }),
  }),
}));
jest.mock('better-auth/plugins/organization/access', () => ({
  defaultStatements: {
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'delete'],
    team: ['create', 'update', 'delete'],
  },
  ownerAc: {
    statements: {
      organization: ['update', 'delete'],
      member: ['create', 'update', 'delete'],
      invitation: ['create', 'delete'],
      team: ['create', 'update', 'delete'],
    },
  },
  adminAc: {
    statements: {
      organization: ['update'],
      member: ['create', 'update', 'delete'],
      invitation: ['create', 'delete'],
      team: ['create', 'update', 'delete'],
    },
  },
}));

import {
  BUILT_IN_ROLE_PERMISSIONS,
  BUILT_IN_ROLE_OBLIGATIONS,
} from '@trycompai/auth';

function hasPortalAccessForBuiltInRoles(roleString: string): boolean {
  const roles = roleString
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const permissions: Record<string, string[]> = {};
  let hasComplianceObligation = false;

  for (const role of roles) {
    const builtInPerms = BUILT_IN_ROLE_PERMISSIONS[role];
    if (builtInPerms) {
      for (const [resource, actions] of Object.entries(builtInPerms)) {
        if (!permissions[resource]) {
          permissions[resource] = [...actions];
        } else {
          for (const action of actions) {
            if (!permissions[resource].includes(action)) {
              permissions[resource].push(action);
            }
          }
        }
      }
      if (BUILT_IN_ROLE_OBLIGATIONS[role]?.compliance) {
        hasComplianceObligation = true;
      }
    }
  }

  if (permissions.portal?.length) return true;
  if (hasComplianceObligation) return true;
  return false;
}

describe('Portal access matrix', () => {
  describe('roles that SHOULD have portal access', () => {
    it.each([
      ['employee'],
      ['contractor'],
      ['owner'],
      ['admin'],
      ['admin,employee'],
      ['admin,member'],
      ['admin,auditor'],
      ['owner,employee'],
      ['employee,contractor'],
    ])('%s → ALLOW', (roleString) => {
      expect(hasPortalAccessForBuiltInRoles(roleString)).toBe(true);
    });
  });

  describe('roles that should NOT have portal access', () => {
    it.each([['auditor'], ['member'], ['']])(
      '%s → DENY',
      (roleString) => {
        expect(hasPortalAccessForBuiltInRoles(roleString)).toBe(false);
      },
    );
  });

  describe('portal access relies on RBAC, not role names', () => {
    it('admin has portal access through its own permissions', () => {
      expect(BUILT_IN_ROLE_PERMISSIONS.admin?.portal).toEqual(
        expect.arrayContaining(['read', 'update']),
      );
    });

    it('auditor is denied portal access by RBAC, not by role name', () => {
      expect(BUILT_IN_ROLE_PERMISSIONS.auditor?.portal).toBeUndefined();
      expect(BUILT_IN_ROLE_OBLIGATIONS.auditor?.compliance).toBeFalsy();
    });

    it('admin does not have compliance obligation', () => {
      expect(BUILT_IN_ROLE_OBLIGATIONS.admin?.compliance).toBeFalsy();
    });

    it('owner has portal access through its own permissions', () => {
      expect(BUILT_IN_ROLE_PERMISSIONS.owner?.portal).toEqual(
        expect.arrayContaining(['read', 'update']),
      );
    });

    it('unrecognized roles are silently skipped, not denied', () => {
      expect(hasPortalAccessForBuiltInRoles('employee,unknown_role')).toBe(
        true,
      );
    });
  });
});

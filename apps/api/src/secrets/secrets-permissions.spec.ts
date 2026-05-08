/**
 * AUTHZ-VULN-01 regression: ensure the `secret` resource is granted only to
 * roles that should see DECRYPTED plaintext credentials.
 *
 * The secrets manager surfaces decrypted values to the user — read access on
 * this resource MUST never be implicit (e.g. via `organization:read`) because
 * read-only auditors would otherwise gain access to plaintext credentials.
 *
 * We mock the `better-auth/plugins/access` and
 * `better-auth/plugins/organization/access` ESM modules using their resolved
 * paths from inside `@trycompai/auth` (otherwise Jest would try to evaluate
 * the real `.mjs` files as CommonJS and crash). Then we import the role
 * definitions directly from `permissions.ts` — bypassing `server.ts`, which
 * pulls in the rest of better-auth.
 */

jest.mock(
  require.resolve('better-auth/plugins/access', {
    paths: [require.resolve('@trycompai/auth')],
  }),
  () => ({
    createAccessControl: (_stmt: Record<string, readonly string[]>) => ({
      newRole: (statements: Record<string, readonly string[]>) => ({
        statements,
      }),
    }),
  }),
);

jest.mock(
  require.resolve('better-auth/plugins/organization/access', {
    paths: [require.resolve('@trycompai/auth')],
  }),
  () => ({
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
  }),
);

// Import permissions.ts directly — going through the package barrel
// (@trycompai/auth) would also load server.ts which pulls the entire
// better-auth surface and breaks the test.
import {
  BUILT_IN_ROLE_PERMISSIONS,
  statement,
} from '../../../../packages/auth/src/permissions';

describe('Secrets resource — role grants', () => {
  const fullCrud = ['create', 'read', 'update', 'delete'];

  it('declares secret in the permission statement schema', () => {
    expect(statement.secret).toEqual(
      expect.arrayContaining(['create', 'read', 'update', 'delete']),
    );
  });

  describe('owner role', () => {
    it('should be granted secret CRUD', () => {
      const perms = BUILT_IN_ROLE_PERMISSIONS.owner;
      expect(perms.secret).toEqual(expect.arrayContaining(fullCrud));
    });
  });

  describe('admin role', () => {
    it('should be granted secret CRUD', () => {
      const perms = BUILT_IN_ROLE_PERMISSIONS.admin;
      expect(perms.secret).toEqual(expect.arrayContaining(fullCrud));
    });
  });

  describe('auditor role', () => {
    // Read-only compliance reviewer. They must NEVER see DECRYPTED secrets.
    it('MUST NOT be granted any secret action', () => {
      const perms = BUILT_IN_ROLE_PERMISSIONS.auditor;
      expect(perms.secret).toBeUndefined();
    });

    it('MUST NOT have secret:read (regression for AUTHZ-VULN-01)', () => {
      const perms = BUILT_IN_ROLE_PERMISSIONS.auditor;
      expect(perms.secret ?? []).not.toContain('read');
    });
  });

  describe('employee role', () => {
    it('MUST NOT be granted any secret action', () => {
      const perms = BUILT_IN_ROLE_PERMISSIONS.employee;
      expect(perms.secret).toBeUndefined();
    });
  });

  describe('contractor role', () => {
    it('MUST NOT be granted any secret action', () => {
      const perms = BUILT_IN_ROLE_PERMISSIONS.contractor;
      expect(perms.secret).toBeUndefined();
    });
  });
});

/**
 * Regression tests for built-in role permissions.
 *
 * Verifies that adding the `portal` resource did not alter
 * the pre-existing permissions of any built-in role.
 *
 * We mock better-auth's ESM modules so the permissions.ts code
 * can execute under Jest, while still testing the real role definitions.
 */

// Mock better-auth ESM modules before importing @trycompai/auth
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

describe('Built-in role permissions — regression', () => {
  // ─── Owner ──────────────────────────────────────────────────────────
  describe('owner', () => {
    const perms = BUILT_IN_ROLE_PERMISSIONS.owner;

    it('should exist', () => {
      expect(perms).toBeDefined();
    });

    it('should have full GRC CRUD', () => {
      const fullCrud = ['create', 'read', 'update', 'delete'];
      for (const resource of [
        'control',
        'evidence',
        'policy',
        'risk',
        'vendor',
        'task',
        'framework',
        'finding',
        'questionnaire',
        'integration',
      ]) {
        expect(perms[resource]).toEqual(expect.arrayContaining(fullCrud));
      }
    });

    it('should have audit create/read/update (no delete)', () => {
      expect(perms.audit).toEqual(
        expect.arrayContaining(['create', 'read', 'update']),
      );
      expect(perms.audit).not.toContain('delete');
    });

    it('should have apiKey create/read/delete', () => {
      expect(perms.apiKey).toEqual(
        expect.arrayContaining(['create', 'read', 'delete']),
      );
    });

    it('should have app:read', () => {
      expect(perms.app).toEqual(expect.arrayContaining(['read']));
    });

    it('should have trust read/update', () => {
      expect(perms.trust).toEqual(expect.arrayContaining(['read', 'update']));
    });

    it('should have pentest create/read/delete', () => {
      expect(perms.pentest).toEqual(
        expect.arrayContaining(['create', 'read', 'delete']),
      );
    });

    it('should have training read/update', () => {
      expect(perms.training).toEqual(
        expect.arrayContaining(['read', 'update']),
      );
    });

    it('should have portal read/update', () => {
      expect(perms.portal).toEqual(expect.arrayContaining(['read', 'update']));
    });

    it('should have organization read/update/delete', () => {
      expect(perms.organization).toEqual(
        expect.arrayContaining(['read', 'update', 'delete']),
      );
    });

    it('should have member CRUD', () => {
      expect(perms.member).toEqual(
        expect.arrayContaining(['create', 'read', 'update', 'delete']),
      );
    });
  });

  // ─── Admin ──────────────────────────────────────────────────────────
  describe('admin', () => {
    const perms = BUILT_IN_ROLE_PERMISSIONS.admin;

    it('should exist', () => {
      expect(perms).toBeDefined();
    });

    it('should have full GRC CRUD', () => {
      const fullCrud = ['create', 'read', 'update', 'delete'];
      for (const resource of [
        'control',
        'evidence',
        'policy',
        'risk',
        'vendor',
        'task',
        'framework',
        'finding',
        'questionnaire',
        'integration',
      ]) {
        expect(perms[resource]).toEqual(expect.arrayContaining(fullCrud));
      }
    });

    it('should NOT have organization:delete', () => {
      expect(perms.organization).not.toContain('delete');
      expect(perms.organization).toEqual(
        expect.arrayContaining(['read', 'update']),
      );
    });

    it('should have app:read', () => {
      expect(perms.app).toEqual(expect.arrayContaining(['read']));
    });

    it('should have training read/update', () => {
      expect(perms.training).toEqual(
        expect.arrayContaining(['read', 'update']),
      );
    });

    it('should have portal read/update', () => {
      expect(perms.portal).toEqual(expect.arrayContaining(['read', 'update']));
    });

    it('should have pentest create/read/delete', () => {
      expect(perms.pentest).toEqual(
        expect.arrayContaining(['create', 'read', 'delete']),
      );
    });
  });

  // ─── Auditor ────────────────────────────────────────────────────────
  describe('auditor', () => {
    const perms = BUILT_IN_ROLE_PERMISSIONS.auditor;

    it('should exist', () => {
      expect(perms).toBeDefined();
    });

    it('should have read-only GRC access (except findings)', () => {
      for (const resource of [
        'control',
        'evidence',
        'policy',
        'risk',
        'vendor',
        'task',
        'framework',
        'audit',
        'questionnaire',
        'integration',
      ]) {
        expect(perms[resource]).toEqual(expect.arrayContaining(['read']));
        expect(perms[resource]).not.toContain('delete');
      }
    });

    it('should have finding create/read/update', () => {
      expect(perms.finding).toEqual(
        expect.arrayContaining(['create', 'read', 'update']),
      );
    });

    it('should have app:read', () => {
      expect(perms.app).toEqual(expect.arrayContaining(['read']));
    });

    it('should have trust:read only (no update)', () => {
      expect(perms.trust).toEqual(expect.arrayContaining(['read']));
      expect(perms.trust).not.toContain('update');
    });

    it('should have pentest:read only', () => {
      expect(perms.pentest).toEqual(expect.arrayContaining(['read']));
      expect(perms.pentest).not.toContain('create');
      expect(perms.pentest).not.toContain('delete');
    });

    it('should NOT have portal permissions', () => {
      expect(perms.portal).toBeUndefined();
    });

    it('should NOT have training permissions', () => {
      expect(perms.training).toBeUndefined();
    });
  });

  // ─── Employee ───────────────────────────────────────────────────────
  describe('employee', () => {
    const perms = BUILT_IN_ROLE_PERMISSIONS.employee;

    it('should exist', () => {
      expect(perms).toBeDefined();
    });

    it('should have policy:read only', () => {
      expect(perms.policy).toEqual(expect.arrayContaining(['read']));
    });

    it('should have portal read/update', () => {
      expect(perms.portal).toEqual(expect.arrayContaining(['read', 'update']));
    });

    it('should NOT have app access', () => {
      expect(perms.app).toBeUndefined();
    });

    it('should NOT have admin resources', () => {
      for (const resource of [
        'control',
        'evidence',
        'risk',
        'vendor',
        'task',
        'framework',
        'audit',
        'finding',
        'questionnaire',
        'integration',
        'apiKey',
        'pentest',
        'training',
      ]) {
        expect(perms[resource]).toBeUndefined();
      }
    });
  });

  // ─── Contractor ─────────────────────────────────────────────────────
  describe('contractor', () => {
    const perms = BUILT_IN_ROLE_PERMISSIONS.contractor;

    it('should exist', () => {
      expect(perms).toBeDefined();
    });

    it('should have same permissions as employee', () => {
      const employeePerms = BUILT_IN_ROLE_PERMISSIONS.employee;
      expect(Object.keys(perms).sort()).toEqual(
        Object.keys(employeePerms).sort(),
      );
      for (const resource of Object.keys(perms)) {
        expect(perms[resource]).toEqual(employeePerms[resource]);
      }
    });

    it('should NOT have app access', () => {
      expect(perms.app).toBeUndefined();
    });
  });

  // ─── Obligations ────────────────────────────────────────────────────
  describe('role obligations', () => {
    it('owner should have compliance obligation', () => {
      expect(BUILT_IN_ROLE_OBLIGATIONS.owner).toEqual({ compliance: true });
    });

    it('admin should have compliance obligation', () => {
      expect(BUILT_IN_ROLE_OBLIGATIONS.admin).toEqual({ compliance: true });
    });

    it('auditor should have NO obligations', () => {
      expect(BUILT_IN_ROLE_OBLIGATIONS.auditor).toEqual({});
    });

    it('employee should have compliance obligation', () => {
      expect(BUILT_IN_ROLE_OBLIGATIONS.employee).toEqual({
        compliance: true,
      });
    });

    it('contractor should have compliance obligation', () => {
      expect(BUILT_IN_ROLE_OBLIGATIONS.contractor).toEqual({
        compliance: true,
      });
    });
  });
});

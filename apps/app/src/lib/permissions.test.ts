import { describe, expect, it } from 'vitest';
import {
  canAccessApp,
  canAccessAuditorView,
  canAccessCompliance,
  canAccessRoute,
  getDefaultRoute,
  hasPermission,
  type UserPermissions,
} from './permissions';

describe('canAccessApp', () => {
  it('returns true for users with explicit app:read', () => {
    const permissions: UserPermissions = { app: ['read'] };
    expect(canAccessApp(permissions)).toBe(true);
  });

  it('returns true for users with pentest permissions (custom role)', () => {
    const permissions: UserPermissions = { pentest: ['create', 'read', 'delete'] };
    expect(canAccessApp(permissions)).toBe(true);
  });

  it('returns true for users with any app-implying resource', () => {
    const permissions: UserPermissions = { control: ['read'] };
    expect(canAccessApp(permissions)).toBe(true);
  });

  it('returns false for portal-only users (employee: policy + compliance only)', () => {
    const permissions: UserPermissions = {
      policy: ['read'],
      compliance: ['required'],
    };
    expect(canAccessApp(permissions)).toBe(false);
  });

  it('returns false for empty permissions', () => {
    expect(canAccessApp({})).toBe(false);
  });

  it('returns false for users with only compliance:required', () => {
    const permissions: UserPermissions = { compliance: ['required'] };
    expect(canAccessApp(permissions)).toBe(false);
  });

  it('returns false for users with only policy:read', () => {
    const permissions: UserPermissions = { policy: ['read'] };
    expect(canAccessApp(permissions)).toBe(false);
  });
});

describe('canAccessRoute', () => {
  it('allows access to penetration-tests with pentest:read', () => {
    const permissions: UserPermissions = { pentest: ['read'] };
    expect(canAccessRoute(permissions, 'penetration-tests')).toBe(true);
  });

  it('denies access to penetration-tests without pentest:read', () => {
    const permissions: UserPermissions = { control: ['read'] };
    expect(canAccessRoute(permissions, 'penetration-tests')).toBe(false);
  });

  it('allows access to unknown routes by default', () => {
    const permissions: UserPermissions = {};
    expect(canAccessRoute(permissions, 'nonexistent-route')).toBe(true);
  });

});

describe('getDefaultRoute', () => {
  it('returns penetration-tests for pentest-only users', () => {
    const permissions: UserPermissions = { pentest: ['create', 'read', 'delete'] };
    const route = getDefaultRoute(permissions, 'org_123');
    expect(route).toBe('/org_123/security/penetration-tests');
  });

  it('returns frameworks as first route for full-access users', () => {
    const permissions: UserPermissions = {
      app: ['read'],
      framework: ['read'],
      control: ['read'],
      pentest: ['read'],
    };
    const route = getDefaultRoute(permissions, 'org_123');
    expect(route).toBe('/org_123/frameworks');
  });

  it('returns null for users with no permissions at all', () => {
    const permissions: UserPermissions = {};
    const route = getDefaultRoute(permissions, 'org_123');
    expect(route).toBeNull();
  });
});

describe('canAccessCompliance', () => {
  it('returns true when user has framework:read', () => {
    const permissions: UserPermissions = { framework: ['read'] };
    expect(canAccessCompliance(permissions)).toBe(true);
  });

  it('returns true when user has policy:read only', () => {
    const permissions: UserPermissions = { policy: ['read'] };
    expect(canAccessCompliance(permissions)).toBe(true);
  });

  it('returns true when user has control:read', () => {
    const permissions: UserPermissions = { control: ['read'] };
    expect(canAccessCompliance(permissions)).toBe(true);
  });

  it('returns false when user has only pentest permissions', () => {
    const permissions: UserPermissions = { pentest: ['create', 'read', 'delete'] };
    expect(canAccessCompliance(permissions)).toBe(false);
  });

  it('returns false for empty permissions', () => {
    expect(canAccessCompliance({})).toBe(false);
  });
});

describe('hasPermission', () => {
  it('returns true when permission exists', () => {
    const permissions: UserPermissions = { pentest: ['create', 'read'] };
    expect(hasPermission(permissions, 'pentest', 'read')).toBe(true);
  });

  it('returns false when resource is missing', () => {
    const permissions: UserPermissions = {};
    expect(hasPermission(permissions, 'pentest', 'read')).toBe(false);
  });

  it('returns false when action is not in the list', () => {
    const permissions: UserPermissions = { pentest: ['read'] };
    expect(hasPermission(permissions, 'pentest', 'create')).toBe(false);
  });
});

// CS-189: Auditor View visibility is intentionally stricter than bare
// `audit:read` — owner and admin implicitly have every permission, but the
// CTO's product decision is that the tab only appears for users whose role
// explicitly scopes them to audit work (built-in auditor OR a custom role
// that specifically grants audit:read).
describe('canAccessAuditorView', () => {
  const noCustom: UserPermissions = {};

  it('shows for the built-in auditor role', () => {
    expect(canAccessAuditorView('auditor', noCustom)).toBe(true);
  });

  it('shows when auditor is one of several roles (e.g. owner,auditor)', () => {
    expect(canAccessAuditorView('owner,auditor', noCustom)).toBe(true);
    expect(canAccessAuditorView('admin, auditor', noCustom)).toBe(true);
  });

  it('hides for owner alone (implicit audit:read does NOT count)', () => {
    expect(canAccessAuditorView('owner', noCustom)).toBe(false);
  });

  it('hides for admin alone (implicit audit:read does NOT count)', () => {
    expect(canAccessAuditorView('admin', noCustom)).toBe(false);
  });

  it('hides for employee / contractor', () => {
    expect(canAccessAuditorView('employee', noCustom)).toBe(false);
    expect(canAccessAuditorView('contractor', noCustom)).toBe(false);
  });

  it('shows when a custom role explicitly grants audit:read', () => {
    const customRolePerms: UserPermissions = { audit: ['read'] };
    expect(canAccessAuditorView('CompAI', customRolePerms)).toBe(true);
  });

  it('shows when owner is combined with a custom role that grants audit:read', () => {
    const customRolePerms: UserPermissions = { audit: ['read'] };
    expect(canAccessAuditorView('owner,CompAI', customRolePerms)).toBe(true);
  });

  it('hides when owner has a custom role that does NOT grant audit:read', () => {
    // Owner's implicit audit:read is what `permissions` would carry, but
    // `canAccessAuditorView` only looks at custom-role permissions — so if
    // the custom role is something like "ReadOnlyViewer" without audit, the
    // tab stays hidden even though the merged permissions would pass.
    const customRolePerms: UserPermissions = { evidence: ['read'] };
    expect(canAccessAuditorView('owner,ReadOnlyViewer', customRolePerms)).toBe(
      false,
    );
  });

  it('hides when role string is empty / null / undefined', () => {
    expect(canAccessAuditorView('', noCustom)).toBe(false);
    expect(canAccessAuditorView(null, noCustom)).toBe(false);
    expect(canAccessAuditorView(undefined, noCustom)).toBe(false);
  });
});

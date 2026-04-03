import { describe, expect, it } from 'vitest';
import {
  canAccessApp,
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

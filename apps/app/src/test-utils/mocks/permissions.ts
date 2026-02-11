import { vi } from 'vitest';
import type { UserPermissions } from '@/lib/permissions';

/**
 * Default mock for usePermissions hook.
 * Call `mockPermissions()` with a permission map to configure what the hook returns.
 *
 * Usage in test files:
 *
 * ```ts
 * import { mockPermissions, mockHasPermission } from '@/test-utils/mocks/permissions';
 *
 * vi.mock('@/hooks/use-permissions', () => ({
 *   usePermissions: () => ({
 *     permissions: mockPermissions,
 *     hasPermission: mockHasPermission,
 *   }),
 * }));
 *
 * // Then in each test:
 * setMockPermissions({ control: ['read', 'create', 'delete'] });
 * // or for no permissions:
 * setMockPermissions({});
 * ```
 */

let _permissions: UserPermissions = {};

export const mockHasPermission = vi.fn(
  (resource: string, action: string): boolean => {
    return _permissions[resource]?.includes(action) ?? false;
  },
);

export const mockPermissions: UserPermissions = new Proxy(
  {},
  {
    get(_target, prop: string) {
      return _permissions[prop];
    },
    ownKeys() {
      return Object.keys(_permissions);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (prop in _permissions) {
        return {
          configurable: true,
          enumerable: true,
          value: _permissions[prop],
        };
      }
      return undefined;
    },
  },
);

/**
 * Set the permissions map for the mock. Call this in beforeEach or individual tests.
 */
export function setMockPermissions(permissions: UserPermissions): void {
  _permissions = permissions;
  // Reset the mock implementation so it uses the new permissions
  mockHasPermission.mockImplementation(
    (resource: string, action: string): boolean => {
      return _permissions[resource]?.includes(action) ?? false;
    },
  );
}

/**
 * Preset: admin permissions (full access to everything)
 */
export const ADMIN_PERMISSIONS: UserPermissions = {
  organization: ['read', 'update'],
  member: ['create', 'read', 'update', 'delete'],
  invitation: ['create', 'read', 'cancel'],
  control: ['create', 'read', 'update', 'delete', 'assign', 'export'],
  evidence: ['create', 'read', 'update', 'delete', 'upload', 'export'],
  policy: ['create', 'read', 'update', 'delete', 'publish', 'approve'],
  risk: ['create', 'read', 'update', 'delete', 'assess', 'export'],
  vendor: ['create', 'read', 'update', 'delete', 'assess'],
  task: ['create', 'read', 'update', 'delete', 'assign', 'complete'],
  framework: ['create', 'read', 'update', 'delete'],
  audit: ['create', 'read', 'update', 'export'],
  finding: ['create', 'read', 'update', 'delete'],
  questionnaire: ['create', 'read', 'update', 'delete', 'respond'],
  integration: ['create', 'read', 'update', 'delete'],
  apiKey: ['create', 'read', 'delete'],
  app: ['read'],
  trust: ['read', 'update'],
};

/**
 * Preset: auditor permissions (read-only + export + findings)
 */
export const AUDITOR_PERMISSIONS: UserPermissions = {
  organization: ['read'],
  member: ['create', 'read'],
  invitation: ['create'],
  control: ['read', 'export'],
  evidence: ['read', 'export'],
  policy: ['read'],
  risk: ['read', 'export'],
  vendor: ['read'],
  task: ['read'],
  framework: ['read'],
  audit: ['read', 'export'],
  finding: ['create', 'read', 'update'],
  questionnaire: ['read'],
  integration: ['read'],
  app: ['read'],
  trust: ['read'],
};

/**
 * Preset: employee permissions (minimal access)
 */
export const EMPLOYEE_PERMISSIONS: UserPermissions = {
  task: ['read', 'complete'],
  evidence: ['read', 'upload'],
  policy: ['read'],
  questionnaire: ['read', 'respond'],
  trust: ['read', 'update'],
};

/**
 * Preset: no permissions at all
 */
export const NO_PERMISSIONS: UserPermissions = {};

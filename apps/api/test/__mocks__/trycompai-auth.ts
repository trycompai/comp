/**
 * Stub for @trycompai/auth.
 * The real package imports better-auth/plugins/access (ESM .mjs).
 * We only need the RBAC constants used by PermissionGuard.
 */
export const PRIVILEGED_ROLES = ['owner', 'admin', 'auditor'];
export const RESTRICTED_ROLES = ['employee', 'contractor'];

// Minimal createAccessControl / role stubs (not needed for these tests)
export const createAccessControl = () => ({});
export const ac = {};
export const allRoles = {};
export const statement: Record<string, string[]> = {
  app: ['create', 'read', 'update', 'delete'],
  member: ['create', 'read', 'update', 'delete'],
  // extend if future tests need more resources
};
export const BUILT_IN_ROLE_PERMISSIONS = {};

export type AccessControl = Record<string, unknown>;

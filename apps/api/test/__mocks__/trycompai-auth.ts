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

export type AccessControl = Record<string, unknown>;

import { allRoles, type RoleName } from '@comp/auth';

/**
 * Effective user permissions — flat map of resource -> actions[].
 * Example: { control: ['read', 'export'], policy: ['read', 'update'] }
 */
export type UserPermissions = Record<string, string[]>;

/** Built-in role names derived from @comp/auth */
const BUILT_IN_ROLE_NAMES_SET = new Set<string>(Object.keys(allRoles));

/**
 * Parse a comma-separated role string into a string[] array.
 * Includes both built-in and custom role names.
 */
export function parseRolesString(rolesStr: string | null | undefined): string[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
}

/**
 * Check if a role name is a built-in role.
 */
export function isBuiltInRole(role: string): role is RoleName {
  return BUILT_IN_ROLE_NAMES_SET.has(role);
}

// ─── Checker functions ───────────────────────────────────────────────

export function hasPermission(
  permissions: UserPermissions,
  resource: string,
  action: string,
): boolean {
  return permissions[resource]?.includes(action) ?? false;
}

export function hasAnyPermission(
  permissions: UserPermissions,
  checks: Array<{ resource: string; action: string }>,
): boolean {
  return checks.some((c) => hasPermission(permissions, c.resource, c.action));
}

// ─── Route-permission mapping ────────────────────────────────────────

/**
 * Maps route segments to required permissions (OR semantics).
 * Single source of truth for both nav visibility and route protection.
 */
export const ROUTE_PERMISSIONS: Record<string, Array<{ resource: string; action: string }>> = {
  // Main compliance pages
  frameworks: [{ resource: 'framework', action: 'read' }],
  auditor: [{ resource: 'audit', action: 'read' }],
  controls: [{ resource: 'control', action: 'read' }],
  policies: [{ resource: 'policy', action: 'read' }],
  tasks: [
    { resource: 'evidence', action: 'read' },
    { resource: 'task', action: 'read' },
  ],
  people: [{ resource: 'member', action: 'read' }],
  risk: [{ resource: 'risk', action: 'read' }],
  vendors: [{ resource: 'vendor', action: 'read' }],
  questionnaire: [{ resource: 'questionnaire', action: 'read' }],
  integrations: [{ resource: 'integration', action: 'read' }],
  'cloud-tests': [{ resource: 'integration', action: 'read' }],
  // Settings pages — top-level is accessible to all app users
  // (sub-page permissions control which settings sections are visible)
  'settings/context-hub': [{ resource: 'evidence', action: 'read' }],
  'settings/api-keys': [{ resource: 'apiKey', action: 'read' }],
  'settings/secrets': [{ resource: 'organization', action: 'update' }],
  'settings/roles': [{ resource: 'member', action: 'read' }],
  'settings/notifications': [{ resource: 'organization', action: 'update' }],
  'settings/browser-connection': [{ resource: 'integration', action: 'read' }],
  // settings/user is intentionally not listed — every user can access their own preferences
};

export function canAccessRoute(permissions: UserPermissions, routeSegment: string): boolean {
  const required = ROUTE_PERMISSIONS[routeSegment];
  if (!required) return true; // Unknown routes accessible by default
  return hasAnyPermission(permissions, required);
}

/**
 * Ordered list of main navigation routes used to find a user's default landing page.
 * Order matches sidebar priority — the first accessible route becomes the default.
 */
const MAIN_NAV_ROUTES: Array<{ segment: string; path: string }> = [
  { segment: 'frameworks', path: '/frameworks' },
  { segment: 'controls', path: '/controls' },
  { segment: 'policies', path: '/policies' },
  { segment: 'tasks', path: '/tasks' },
  { segment: 'people', path: '/people/all' },
  { segment: 'risk', path: '/risk' },
  { segment: 'vendors', path: '/vendors' },
  { segment: 'integrations', path: '/integrations' },
  { segment: 'cloud-tests', path: '/cloud-tests' },
  { segment: 'settings', path: '/settings' },
];

/**
 * Find the first accessible route for a user based on their permissions.
 * Returns the path (e.g. "/{orgId}/policies") or null if none accessible.
 */
export function getDefaultRoute(permissions: UserPermissions, orgId: string): string | null {
  for (const { segment, path } of MAIN_NAV_ROUTES) {
    if (canAccessRoute(permissions, segment)) {
      return `/${orgId}${path}`;
    }
  }
  return null;
}

/**
 * Check if user can access the main app (as opposed to portal-only).
 * Only users with explicit `app:read` permission can access the app.
 * Employees and contractors are portal-only — they have `policy:read` but NOT `app:read`.
 */
export function canAccessApp(permissions: UserPermissions): boolean {
  return hasPermission(permissions, 'app', 'read');
}

/**
 * Check if user has the compliance:required permission,
 * meaning they must complete compliance tasks (policy signing, training, etc.).
 */
export function requiresCompliance(permissions: UserPermissions): boolean {
  return hasPermission(permissions, 'compliance', 'required');
}

// ─── Permission resolver (no server-only imports) ────────────────────

const BUILT_IN_ROLE_NAMES = Object.keys(allRoles);

/**
 * Resolve effective permissions for a member's comma-separated role string.
 * Handles built-in roles (from @comp/auth). For custom roles, pass them
 * via the customRolePermissions parameter.
 */
export function resolveBuiltInPermissions(roleString: string | null | undefined): {
  permissions: UserPermissions;
  customRoleNames: string[];
} {
  if (!roleString) return { permissions: {}, customRoleNames: [] };

  const roleNames = roleString
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const combined: UserPermissions = {};

  const customRoleNames = roleNames.filter((name) => !BUILT_IN_ROLE_NAMES.includes(name));

  for (const roleName of roleNames) {
    if (BUILT_IN_ROLE_NAMES.includes(roleName)) {
      const role = allRoles[roleName as RoleName];
      if (role) {
        mergePermissions(combined, role.statements as Record<string, string[]>);
      }
    }
  }

  return { permissions: combined, customRoleNames };
}

export function mergePermissions(target: UserPermissions, source: Record<string, string[]>): void {
  for (const [resource, actions] of Object.entries(source)) {
    if (!target[resource]) {
      target[resource] = [];
    }
    for (const action of actions) {
      if (!target[resource].includes(action)) {
        target[resource].push(action);
      }
    }
  }
}

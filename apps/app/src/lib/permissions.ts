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
  documents: [{ resource: 'evidence', action: 'read' }],
  questionnaire: [{ resource: 'questionnaire', action: 'read' }],
  integrations: [{ resource: 'integration', action: 'read' }],
  'cloud-tests': [{ resource: 'integration', action: 'read' }],
  // Trust center
  trust: [{ resource: 'trust', action: 'read' }],
  // Security product
  'penetration-tests': [{ resource: 'pentest', action: 'read' }],
  // Settings — top-level requires access to at least one sub-page resource
  settings: [
    { resource: 'organization', action: 'update' },
    { resource: 'evidence', action: 'read' },
    { resource: 'apiKey', action: 'read' },
    { resource: 'member', action: 'read' },
    { resource: 'integration', action: 'read' },
  ],
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
  { segment: 'penetration-tests', path: '/security/penetration-tests' },
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
 * Resources that imply the user should have access to the main app.
 * Portal-only resources (policy, compliance) are excluded — employees/contractors
 * have those but should NOT enter the app.
 */
const APP_IMPLYING_RESOURCES = new Set([
  'organization', 'member', 'control', 'evidence', 'risk', 'vendor',
  'task', 'framework', 'audit', 'finding', 'questionnaire', 'integration',
  'apiKey', 'trust', 'pentest',
]);

/** Compliance route segments — used to determine if the Compliance rail icon should show. */
const COMPLIANCE_ROUTE_SEGMENTS = [
  'frameworks', 'controls', 'policies', 'tasks', 'documents', 'people',
  'risk', 'vendors', 'questionnaire', 'integrations', 'cloud-tests', 'auditor',
] as const;

/**
 * Check if user can access any compliance route.
 * Used to gate the Compliance rail icon — shows if user has read on any compliance resource.
 */
export function canAccessCompliance(permissions: UserPermissions): boolean {
  return COMPLIANCE_ROUTE_SEGMENTS.some((segment) => canAccessRoute(permissions, segment));
}

/**
 * Check if user can access the main app (as opposed to portal-only).
 *
 * Returns true if the user has explicit `app:read` (built-in roles like owner/admin/auditor),
 * OR if they have any permission on a resource that implies app access (e.g. a custom role
 * with only `pentest:read`).
 *
 * Employees and contractors are portal-only — they only have `policy:read`
 * and compliance obligations, neither of which is in APP_IMPLYING_RESOURCES.
 */
export function canAccessApp(permissions: UserPermissions): boolean {
  if (hasPermission(permissions, 'app', 'read')) return true;

  for (const resource of Object.keys(permissions)) {
    if (APP_IMPLYING_RESOURCES.has(resource) && permissions[resource]?.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Check if any of the user's roles have the compliance obligation.
 */
export function requiresComplianceObligation(obligations: Record<string, boolean>): boolean {
  return Boolean(obligations?.compliance);
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

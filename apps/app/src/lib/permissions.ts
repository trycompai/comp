import { allRoles, type RoleName } from '@trycompai/auth';

/**
 * Effective user permissions — flat map of resource -> actions[].
 * Example: { control: ['read', 'export'], policy: ['read', 'update'] }
 */
export type UserPermissions = Record<string, string[]>;

/** Built-in role names derived from @trycompai/auth */
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

/** Sort + de-dupe a comma-separated role string into a canonical form. */
export function normalizeRoleString(rolesStr: string | null | undefined): string {
  return [...new Set(parseRolesString(rolesStr))].sort().join(',');
}

/**
 * Union the invited roles into an existing comma-separated role string.
 * Used when an existing member is (re-)invited: we add the new roles rather
 * than replacing, so a member is never stripped of a role they already hold.
 */
export function mergeRoleStrings(
  existingRoles: string | null | undefined,
  invitedRoles: string | null | undefined,
): string {
  return [...new Set([...parseRolesString(existingRoles), ...parseRolesString(invitedRoles)])]
    .sort()
    .join(',');
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
  overview: [{ resource: 'framework', action: 'read' }],
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
    { resource: 'secret', action: 'read' },
  ],
  'settings/context-hub': [{ resource: 'evidence', action: 'read' }],
  'settings/api-keys': [{ resource: 'apiKey', action: 'read' }],
  'settings/secrets': [{ resource: 'secret', action: 'read' }],
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
 * CS-189: Auditor View visibility rule (product decision).
 *
 * "Auditor View" is scoped to audit work — it should only appear for users
 * whose role explicitly grants audit access, not for owners/admins whose
 * implicit all-permissions include `audit:read`.
 *
 * Show the tab iff:
 *  - user has the built-in `auditor` role, OR
 *  - user has a custom org role that explicitly grants `audit:read`.
 *
 * Owners/admins who want this tab can opt in by adding the auditor role
 * to their membership or by creating a custom role that includes
 * `audit:read`. Multi-role users are handled because `auditor` can be
 * one of several roles on a membership.
 */
export function canAccessAuditorView(
  roleString: string | null | undefined,
  customRolePermissions: UserPermissions,
): boolean {
  const roles = parseRolesString(roleString);
  if (roles.includes('auditor')) return true;
  return hasPermission(customRolePermissions, 'audit', 'read');
}

/**
 * Ordered list of main navigation routes used to find a user's default landing page.
 * Order matches sidebar priority — the first accessible route becomes the default.
 */
const MAIN_NAV_ROUTES: Array<{ segment: string; path: string }> = [
  { segment: 'overview', path: '/overview' },
  { segment: 'frameworks', path: '/frameworks' },
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

/** Compliance route segments — used to determine if the Compliance rail icon should show. */
const COMPLIANCE_ROUTE_SEGMENTS = [
  'overview', 'frameworks', 'controls', 'policies', 'tasks', 'documents', 'people',
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
 * Requires explicit `app:read` — controlled by the "App Access" toggle
 * on custom roles, and included by default in owner/admin/auditor.
 */
export function canAccessApp(permissions: UserPermissions): boolean {
  return hasPermission(permissions, 'app', 'read');
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
 * Handles built-in roles (from @trycompai/auth). For custom roles, pass them
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

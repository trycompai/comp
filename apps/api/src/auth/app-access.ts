import { BUILT_IN_ROLE_PERMISSIONS, statement } from '@trycompai/auth';
import { db } from '@db';

/** Safely parse a custom role's stored permissions; malformed JSON → `{}` (never throws). */
function parsePermissions(raw: unknown): Record<string, string[]> {
  if (raw && typeof raw === 'object') {
    return raw as Record<string, string[]>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, string[]>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function mergeInto(
  target: Record<string, Set<string>>,
  perms: Record<string, string[]>,
): void {
  for (const [resource, actions] of Object.entries(perms)) {
    if (!Array.isArray(actions)) continue;
    target[resource] ??= new Set<string>();
    for (const action of actions) target[resource].add(action);
  }
}

/**
 * Merge the effective permissions (`{ resource: actions[] }`) for a set of role
 * names in an org. Built-in roles resolve from `BUILT_IN_ROLE_PERMISSIONS`
 * (own-property lookup only, so a custom role named e.g. `constructor` is not
 * mistaken for a built-in); custom roles resolve from `organization_role` rows
 * (malformed JSON is ignored, not thrown). Comma-separated roles are a union.
 */
export async function resolveRolePermissions(
  organizationId: string,
  roles: string[],
): Promise<Record<string, string[]>> {
  const merged: Record<string, Set<string>> = {};
  const customRoleNames: string[] = [];

  for (const role of roles) {
    if (Object.prototype.hasOwnProperty.call(BUILT_IN_ROLE_PERMISSIONS, role)) {
      mergeInto(merged, BUILT_IN_ROLE_PERMISSIONS[role]);
    } else if (role) {
      customRoleNames.push(role);
    }
  }

  if (customRoleNames.length > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: { organizationId, name: { in: customRoleNames } },
      select: { permissions: true },
    });
    for (const customRole of customRoles) {
      mergeInto(merged, parsePermissions(customRole.permissions));
    }
  }

  const result: Record<string, string[]> = {};
  for (const [resource, actions] of Object.entries(merged)) {
    result[resource] = [...actions];
  }
  return result;
}

/** Whether resolved permissions grant `resource:action`. */
export function permissionsGrant(
  permissions: Record<string, string[]>,
  resource: string,
  action: string,
): boolean {
  return permissions[resource]?.includes(action) ?? false;
}

/**
 * Same as `resolveRolePermissions`, but every custom (non-built-in) role
 * additionally grants `portal` access. The custom-role editor UI has no
 * toggle for the 'portal' resource (`PermissionMatrix.tsx`'s
 * `ACCESS_TOGGLES` only exposes 'app'), so a custom role's stored
 * permissions never include it — without this, no custom role could ever
 * pass a `portal:*` check (e.g. training video completions), regardless of
 * what the org admin intended when creating the role. Built-in roles are
 * unaffected: their real statement already decides whether they get portal
 * (e.g. `auditor` intentionally does not).
 */
export async function resolveRolePermissionsWithImplicitPortal(
  organizationId: string,
  roles: string[],
): Promise<Record<string, string[]>> {
  const resolved = await resolveRolePermissions(organizationId, roles);

  const hasCustomRole = roles.some(
    (role) =>
      role &&
      !Object.prototype.hasOwnProperty.call(BUILT_IN_ROLE_PERMISSIONS, role),
  );
  if (!hasCustomRole) return resolved;

  const portalActions = new Set([
    ...(resolved.portal ?? []),
    ...statement.portal,
  ]);
  return { ...resolved, portal: [...portalActions] };
}

/** Whether every required `resource:action` pair is present in `permissions`. */
export function allPermissionsGranted(
  permissions: Record<string, string[]>,
  required: Record<string, string[]>,
): boolean {
  return Object.entries(required).every(([resource, actions]) =>
    actions.every((action) => permissionsGrant(permissions, resource, action)),
  );
}

/**
 * Whether a member's role(s) grant **app access** (`app:read`) in the given org
 * — the same gate the web app uses (owner/admin/auditor + custom roles with the
 * "App Access" toggle), excluding Portal-only roles (employee/contractor).
 */
export async function hasAppAccess(
  organizationId: string,
  roleString: string | null,
): Promise<boolean> {
  if (!roleString) return false;
  const roles = roleString
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  if (roles.length === 0) return false;

  const perms = await resolveRolePermissions(organizationId, roles);
  return permissionsGrant(perms, 'app', 'read');
}

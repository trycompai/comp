import { BUILT_IN_ROLE_PERMISSIONS } from '@trycompai/auth';
import { db } from '@db';

/**
 * Whether a member's role(s) grant **app access** (`app:read`) in the given org.
 *
 * This is the same gate the web app uses to decide who can use the product
 * (owner/admin/auditor + custom roles with the "App Access" toggle) versus
 * Portal-only roles (employee/contractor). Built-in roles resolve from the
 * static `BUILT_IN_ROLE_PERMISSIONS` map; custom roles from the org's
 * `organization_role` rows. `member.role` is comma-separated and treated as a
 * union — ANY granting role is sufficient.
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

  const customRoleNames: string[] = [];
  for (const role of roles) {
    const builtIn = BUILT_IN_ROLE_PERMISSIONS[role];
    if (builtIn) {
      if (builtIn['app']?.includes('read')) return true;
    } else {
      customRoleNames.push(role);
    }
  }

  if (customRoleNames.length === 0) return false;

  const customRoles = await db.organizationRole.findMany({
    where: { organizationId, name: { in: customRoleNames } },
    select: { permissions: true },
  });
  for (const customRole of customRoles) {
    const perms =
      typeof customRole.permissions === 'string'
        ? (JSON.parse(customRole.permissions) as Record<string, string[]>)
        : (customRole.permissions as Record<string, string[]>);
    if (perms?.['app']?.includes('read')) return true;
  }

  return false;
}

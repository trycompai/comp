import 'server-only';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  type UserPermissions,
  canAccessRoute,
  getDefaultRoute,
  mergePermissions,
  resolveBuiltInPermissions,
} from './permissions';

/**
 * Resolve effective permissions for a member's comma-separated role string.
 * Handles both built-in roles (from @comp/auth) and custom roles (from DB).
 */
export async function resolveUserPermissions(
  roleString: string | null | undefined,
  organizationId: string,
): Promise<UserPermissions> {
  const { permissions, customRoleNames } =
    resolveBuiltInPermissions(roleString);

  if (customRoleNames.length > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: {
        organizationId,
        name: { in: customRoleNames },
      },
      select: { permissions: true },
    });

    for (const role of customRoles) {
      if (!role.permissions) continue;
      const parsed =
        typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : role.permissions;
      if (parsed && typeof parsed === 'object') {
        mergePermissions(permissions, parsed as Record<string, string[]>);
      }
    }
  }

  return permissions;
}

/**
 * Resolve permissions for the current user in the given org.
 * Self-contained: fetches session, finds member, resolves permissions.
 */
export async function resolveCurrentUserPermissions(
  orgId: string,
): Promise<UserPermissions | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) return null;

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      deactivated: false,
    },
    select: { role: true },
  });

  if (!member) return null;

  return resolveUserPermissions(member.role, orgId);
}

/**
 * Route guard for server page components.
 * Resolves permissions for the current user and redirects if they
 * don't have access to the given route segment.
 */
export async function requireRoutePermission(
  routeSegment: string,
  orgId: string,
): Promise<void> {
  const permissions = await resolveCurrentUserPermissions(orgId);

  if (!permissions || !canAccessRoute(permissions, routeSegment)) {
    const defaultRoute = permissions
      ? getDefaultRoute(permissions, orgId)
      : null;
    redirect(defaultRoute ?? '/no-access');
  }
}

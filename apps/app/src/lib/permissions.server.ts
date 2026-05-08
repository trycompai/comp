import 'server-only';

import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import {
  type UserPermissions,
  canAccessAuditorView,
  canAccessRoute,
  getDefaultRoute,
  hasPermission,
  mergePermissions,
  resolveBuiltInPermissions,
} from './permissions';

/**
 * Resolve effective permissions for a member's comma-separated role string.
 * Handles both built-in roles (from @trycompai/auth) and custom roles (from DB).
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

/**
 * CS-189: Resolve only the permissions granted by the user's CUSTOM org
 * roles (i.e. not from built-in roles). Needed for the Auditor View
 * visibility rule, which wants to know whether a custom role explicitly
 * grants `audit:read` — owner/admin's implicit all-permissions don't count.
 */
export async function resolveCustomRolePermissions(
  roleString: string | null | undefined,
  orgId: string,
): Promise<UserPermissions> {
  const { customRoleNames } = resolveBuiltInPermissions(roleString);
  const result: UserPermissions = {};
  if (customRoleNames.length === 0) return result;

  const customRoles = await db.organizationRole.findMany({
    where: { organizationId: orgId, name: { in: customRoleNames } },
    select: { permissions: true },
  });

  for (const role of customRoles) {
    if (!role.permissions) continue;
    const parsed =
      typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : role.permissions;
    if (parsed && typeof parsed === 'object') {
      mergePermissions(result, parsed as Record<string, string[]>);
    }
  }
  return result;
}

/**
 * Server-side Auditor View access check. Mirrors the client-side
 * `canAccessAuditorView` but pulls the custom-role permissions from the
 * DB for the current user. Returns null if the user isn't in the org.
 */
export async function resolveAuditorViewAccess(
  orgId: string,
): Promise<{ canAccess: boolean; roleString: string | null } | null> {
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

  const customPerms = await resolveCustomRolePermissions(member.role, orgId);
  return {
    canAccess: canAccessAuditorView(member.role, customPerms),
    roleString: member.role,
  };
}

/**
 * Route guard for the Auditor View page. Replaces `requireRoutePermission(
 * 'auditor', orgId)` — the plain permission check let owner/admin through
 * via their implicit `audit:read`. This helper enforces the stricter
 * "built-in auditor OR custom role with audit:read" rule.
 */
export async function requireAuditorViewAccess(orgId: string): Promise<void> {
  const result = await resolveAuditorViewAccess(orgId);
  if (result?.canAccess) return;

  const permissions = await resolveCurrentUserPermissions(orgId);
  const defaultRoute = permissions
    ? getDefaultRoute(permissions, orgId)
    : null;
  redirect(defaultRoute ?? '/no-access');
}

export interface ApiPermissionContext {
  organizationId: string;
  userId: string;
  permissions: UserPermissions;
}

/**
 * Permission guard for Next.js Route Handlers (`app/api/.../route.ts`). On
 * success, returns a context object with the active org id, user id, and
 * resolved permissions. On failure, returns a `NextResponse` to forward to
 * the client. Caller pattern:
 *
 *     const ctx = await requireApiPermission(req, 'risk', 'update');
 *     if (ctx instanceof NextResponse) return ctx;
 *     // ...use ctx.organizationId, ctx.permissions...
 *
 * The Next.js mutation routes for risk/vendor auto-link, relink, and unlink
 * orchestrate work that the NestJS API doesn't host directly (trigger.dev
 * tokens, Upstash queries, Prisma joins). These endpoints still need the
 * same RBAC contract as the API — see Cubic finding #9 on PR #2671.
 */
export async function requireApiPermission(
  req: Request,
  resource: string,
  action: string,
): Promise<ApiPermissionContext | NextResponse> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const organizationId = session.session.activeOrganizationId;
  const userId = session.user.id;

  const member = await db.member.findFirst({
    where: { userId, organizationId, deactivated: false },
    select: { role: true },
  });
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await resolveUserPermissions(member.role, organizationId);
  if (!hasPermission(permissions, resource, action)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { organizationId, userId, permissions };
}

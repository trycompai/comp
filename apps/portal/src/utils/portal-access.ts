import {
  BUILT_IN_ROLE_OBLIGATIONS,
  BUILT_IN_ROLE_PERMISSIONS,
} from '@trycompai/auth';
import { db } from '@db/server';

export async function hasPortalAccess({
  roleString,
  organizationId,
}: {
  roleString: string;
  organizationId: string;
}): Promise<boolean> {
  const roles = roleString.split(',').map((r) => r.trim());
  const builtInNames = new Set(Object.keys(BUILT_IN_ROLE_PERMISSIONS));
  const customRoleNames: string[] = [];

  for (const role of roles) {
    if (builtInNames.has(role)) {
      const perms = BUILT_IN_ROLE_PERMISSIONS[role];
      if (perms?.portal?.length > 0) return true;
      if (BUILT_IN_ROLE_OBLIGATIONS[role]?.compliance) return true;
    } else {
      customRoleNames.push(role);
    }
  }

  if (customRoleNames.length === 0) return false;

  const customRoles = await db.organizationRole.findMany({
    where: { organizationId, name: { in: customRoleNames } },
    select: { permissions: true, obligations: true },
  });

  for (const role of customRoles) {
    const perms =
      typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : role.permissions;
    if (
      perms &&
      typeof perms === 'object' &&
      Array.isArray(perms.portal) &&
      perms.portal.length > 0
    ) {
      return true;
    }

    const obligations =
      typeof role.obligations === 'string'
        ? JSON.parse(role.obligations)
        : role.obligations;
    if (obligations && typeof obligations === 'object' && obligations.compliance) {
      return true;
    }
  }

  return false;
}

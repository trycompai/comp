import {
  BUILT_IN_ROLE_OBLIGATIONS,
  BUILT_IN_ROLE_PERMISSIONS,
  parseRoleObligations,
  parseRolePermissions,
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
      if (BUILT_IN_ROLE_PERMISSIONS[role]?.portal?.length > 0) return true;
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
    const perms = parseRolePermissions(role.permissions);
    if (perms?.portal?.length) return true;

    const obligations = parseRoleObligations(role.obligations);
    if (obligations.compliance) return true;
  }

  return false;
}

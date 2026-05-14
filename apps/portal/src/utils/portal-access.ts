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
  const roles = roleString.split(',').map((r) => r.trim()).filter(Boolean);
  const permissions: Record<string, string[]> = {};
  let hasComplianceObligation = false;
  const customRoleNames: string[] = [];

  for (const role of roles) {
    const builtInPerms = BUILT_IN_ROLE_PERMISSIONS[role];
    if (builtInPerms) {
      mergePermissions(permissions, builtInPerms);
      if (BUILT_IN_ROLE_OBLIGATIONS[role]?.compliance) {
        hasComplianceObligation = true;
      }
    } else {
      customRoleNames.push(role);
    }
  }

  if (customRoleNames.length > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: { organizationId, name: { in: customRoleNames } },
      select: { permissions: true, obligations: true },
    });

    for (const role of customRoles) {
      const perms = parseRolePermissions(role.permissions);
      if (perms) mergePermissions(permissions, perms);
      if (parseRoleObligations(role.obligations).compliance) {
        hasComplianceObligation = true;
      }
    }
  }

  if (permissions.portal?.length) return true;
  if (hasComplianceObligation) return true;

  return false;
}

function mergePermissions(
  target: Record<string, string[]>,
  source: Record<string, string[]>,
): void {
  for (const [resource, actions] of Object.entries(source)) {
    if (!target[resource]) {
      target[resource] = [...actions];
    } else {
      for (const action of actions) {
        if (!target[resource].includes(action)) {
          target[resource].push(action);
        }
      }
    }
  }
}

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

  // Built-in role permissions come from the hardcoded map. Obligations can be
  // overridden per-org by a row in organization_role with the built-in name.
  for (const role of roles) {
    const builtInPerms = BUILT_IN_ROLE_PERMISSIONS[role];
    if (builtInPerms) mergePermissions(permissions, builtInPerms);
  }

  if (roles.length > 0) {
    const dbRoles = await db.organizationRole.findMany({
      where: { organizationId, name: { in: roles } },
      select: { name: true, permissions: true, obligations: true },
    });
    type DbRoleRow = (typeof dbRoles)[number];
    const overrideByName = new Map<string, DbRoleRow>(
      dbRoles.map((r: DbRoleRow) => [r.name, r] as const),
    );

    for (const role of roles) {
      const dbRow = overrideByName.get(role);
      const isBuiltIn = Boolean(BUILT_IN_ROLE_PERMISSIONS[role]);

      if (dbRow) {
        // For custom roles, the DB row is the source of permissions.
        // For built-in roles, we only consult it for the obligations override.
        if (!isBuiltIn) {
          const perms = parseRolePermissions(dbRow.permissions);
          if (perms) mergePermissions(permissions, perms);
        }
        if (parseRoleObligations(dbRow.obligations).compliance) {
          hasComplianceObligation = true;
        }
        continue;
      }

      if (isBuiltIn && BUILT_IN_ROLE_OBLIGATIONS[role]?.compliance) {
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

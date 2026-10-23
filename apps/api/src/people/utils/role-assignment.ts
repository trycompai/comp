import { db } from '@db';
import {
  BUILT_IN_ROLE_PERMISSIONS,
  isRestrictedRole,
  parseRolePermissions,
} from '@trycompai/auth';

export interface RoleAssignmentContext {
  organizationId: string;
  callerRole?: string;
  isApiKey?: boolean;
  apiKeyScopes?: string[];
}

export async function validateAssignableRoles(
  targetRoles: string[],
  callerMemberActions: Set<string>,
  context: RoleAssignmentContext,
): Promise<string | null> {
  const hasWriteAccess = ['create', 'read', 'update', 'delete'].every((a) =>
    callerMemberActions.has(a),
  );
  if (hasWriteAccess) return null;

  const disallowedBuiltIns: string[] = [];
  const customRoleNames: string[] = [];
  for (const role of targetRoles) {
    if (isRestrictedRole(role)) continue;
    if (Object.hasOwn(BUILT_IN_ROLE_PERMISSIONS, role)) {
      disallowedBuiltIns.push(role);
    } else {
      customRoleNames.push(role);
    }
  }

  const errors: string[] = [];
  if (disallowedBuiltIns.length > 0) {
    errors.push(
      `You cannot assign privileged roles: ${disallowedBuiltIns.join(', ')}.`,
    );
  }

  if (customRoleNames.length > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: {
        organizationId: context.organizationId,
        name: { in: customRoleNames },
      },
      select: { name: true, permissions: true },
    });

    const resolvedNames = new Set(customRoles.map((r) => r.name));
    const unresolvable = customRoleNames.filter((n) => !resolvedNames.has(n));
    if (unresolvable.length > 0) {
      errors.push(
        `You cannot assign unknown or out-of-organization custom roles: ${unresolvable.join(', ')}.`,
      );
    }

    const callerPermissions = await resolveCallerEffectivePermissions(context);
    const escalations: string[] = [];
    for (const role of customRoles) {
      const perms = parseRolePermissions(role.permissions) ?? {};
      if (!isPermissionSubset(perms, callerPermissions)) {
        escalations.push(role.name);
      }
    }
    if (escalations.length > 0) {
      errors.push(
        `You cannot assign custom roles that grant permissions you do not hold: ${escalations.join(', ')}.`,
      );
    }
  }

  if (errors.length > 0) return errors.join(' ');
  return null;
}

export async function resolveCallerMemberActions(params: {
  callerRole: string;
  organizationId: string;
  isApiKey?: boolean;
  apiKeyScopes?: string[];
}): Promise<Set<string>> {
  const { callerRole, organizationId, isApiKey, apiKeyScopes } = params;

  if (isApiKey) {
    if (!apiKeyScopes || apiKeyScopes.length === 0) {
      return new Set(['create', 'read', 'update', 'delete']);
    }
    const apiKeyActions = new Set<string>();
    for (const scope of apiKeyScopes) {
      const [resource, action] = scope.split(':');
      if (resource === 'member' && action) {
        apiKeyActions.add(action);
      }
    }
    return apiKeyActions;
  }

  const roles = callerRole.split(',').map((r) => r.trim());
  const actions = new Set<string>();
  const customRoleNames: string[] = [];

  for (const role of roles) {
    const builtIn = BUILT_IN_ROLE_PERMISSIONS[role];
    if (builtIn?.member) {
      for (const a of builtIn.member) actions.add(a);
    }
    if (!Object.hasOwn(BUILT_IN_ROLE_PERMISSIONS, role)) {
      customRoleNames.push(role);
    }
  }

  if (customRoleNames.length > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: { organizationId, name: { in: customRoleNames } },
      select: { permissions: true },
    });
    for (const role of customRoles) {
      const perms = parseRolePermissions(role.permissions);
      if (perms?.member) {
        for (const a of perms.member) actions.add(a);
      }
    }
  }

  return actions;
}

async function resolveCallerEffectivePermissions(
  params: RoleAssignmentContext,
): Promise<Record<string, string[]>> {
  const { organizationId, callerRole, isApiKey, apiKeyScopes } = params;

  const merged: Record<string, Set<string>> = {};
  const grant = (perms: Record<string, string[]> | null) => {
    if (!perms) return;
    for (const [resource, actions] of Object.entries(perms)) {
      if (!Array.isArray(actions)) continue;
      merged[resource] ??= new Set<string>();
      for (const action of actions) {
        merged[resource].add(action);
      }
    }
  };

  if (isApiKey) {
    for (const scope of apiKeyScopes ?? []) {
      const [resource, action] = scope.split(':');
      if (!resource || !action) continue;
      merged[resource] ??= new Set<string>();
      merged[resource].add(action);
    }
  } else {
    const roles = (callerRole ?? '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const customRoleNames: string[] = [];
    for (const role of roles) {
      if (Object.hasOwn(BUILT_IN_ROLE_PERMISSIONS, role)) {
        grant(BUILT_IN_ROLE_PERMISSIONS[role]);
      } else {
        customRoleNames.push(role);
      }
    }
    if (customRoleNames.length > 0) {
      const customRoles = await db.organizationRole.findMany({
        where: { organizationId, name: { in: customRoleNames } },
        select: { permissions: true },
      });
      for (const role of customRoles) {
        grant(parseRolePermissions(role.permissions));
      }
    }
  }

  return Object.fromEntries(
    Object.entries(merged).map(([resource, actions]) => [
      resource,
      [...actions],
    ]),
  );
}

function isPermissionSubset(
  granted: Record<string, string[]>,
  held: Record<string, string[]>,
): boolean {
  for (const [resource, actions] of Object.entries(granted)) {
    if (!Array.isArray(actions)) continue;
    const heldActions = new Set(held[resource] ?? []);
    for (const action of actions) {
      if (!heldActions.has(action)) return false;
    }
  }
  return true;
}

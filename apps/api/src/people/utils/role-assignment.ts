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

/**
 * Full member write (create+read+update+delete) lets a caller assign any
 * role. Partial member access (e.g. auditor with create+read, or an API key
 * scoped to only member:create) can only assign restricted roles
 * (employee/contractor) — plus custom roles, but only when the caller's own
 * effective permissions are a superset of the custom role's: a custom role is
 * just a named permission bundle, so assigning one that grants more than the
 * caller holds is the same privilege escalation as assigning a built-in
 * privileged role.
 *
 * The context is REQUIRED and the custom-role check is fail-closed: a limited
 * caller assigning a custom role whose row cannot be found, or whose
 * permissions cannot be resolved against the caller's, is rejected — never
 * silently authorized. Omission is a type error; there is no "skip the
 * custom-role check" path.
 */
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

    // Fail closed: a limited caller may only assign a custom role we can
    // actually resolve and prove is within their own permissions. A role name
    // that matches no row in this org (typo, or a role from another org) is
    // rejected rather than waved through.
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

/**
 * The caller's member actions, derived from their role for sessions or from
 * the key's scopes for API-key auth (mirroring the PermissionGuard's scope
 * model): a key with full member management — or a legacy full-access key —
 * can assign any role, while a key scoped to only `member:create` stays
 * restricted.
 */
export async function resolveCallerMemberActions(params: {
  callerRole: string;
  organizationId: string;
  isApiKey?: boolean;
  apiKeyScopes?: string[];
}): Promise<Set<string>> {
  const { callerRole, organizationId, isApiKey, apiKeyScopes } = params;

  if (isApiKey) {
    // Legacy keys (empty scopes) = full access.
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
    // Own-property check, same reason as in rolesHaveAppAccess: truthiness
    // would treat a caller's custom role named after an Object.prototype
    // member as built-in, never loading its `member` actions.
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

/**
 * The caller's full effective permission set (every resource), derived the
 * same way as resolveCallerMemberActions but without narrowing to `member`:
 * scoped API keys contribute their scopes; sessions contribute the union of
 * their built-in and custom role statements. Legacy full-access keys are
 * rejected upstream by the write-access gate and never reach this lookup.
 */
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
      // Same own-property check as resolveCallerMemberActions.
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

/**
 * True when every action `granted` assigns is something `held` already has —
 * the superset rule for custom-role assignment.
 */
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

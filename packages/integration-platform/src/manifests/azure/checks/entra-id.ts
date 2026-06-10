import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  combineReadFailures,
  remediationForReadFailure,
  toHttpReadFailure,
  type ReadFailure,
} from '../../http-read-failure';
import { ARM_BASE, armListAllOrFail, resolveAzureSubscriptionId } from './shared';

interface RoleAssignment {
  properties: { roleDefinitionId: string; principalId: string; principalType: string };
}

interface RoleDefinition {
  id: string;
  properties: {
    roleName: string;
    type: string;
    permissions: Array<{ actions: string[]; dataActions?: string[] }>;
  };
}

// Secondary, name-based fallback only. Permission-based classification
// (see actionIsHighPrivilege / defIsPrivileged) is the primary signal.
const PRIVILEGED_ROLES = new Set([
  'Owner',
  'Contributor',
  'User Access Administrator',
  // Global Administrator / Privileged Role Administrator are Entra directory
  // roles (not ARM); kept for completeness — they won't appear on this endpoint.
  'Global Administrator',
  'Privileged Role Administrator',
]);

// Any action containing a '*' is treated as a wildcard — covers bare '*',
// suffix forms (read-all), and mid-path wildcards (e.g. Microsoft.Network).
const isWildcardAction = (act: string) => act.includes('*');

/** High-privilege ARM actions that make a role privileged regardless of its name. */
function actionIsHighPrivilege(act: string): boolean {
  const a = act.toLowerCase();
  return (
    a === '*' ||
    a === '*/write' ||
    a === 'microsoft.authorization/*' ||
    a === 'microsoft.authorization/roleassignments/write' ||
    a === 'microsoft.authorization/roledefinitions/write'
  );
}

/**
 * A role is privileged primarily because its permissions grant high-privilege
 * actions; the built-in privileged role-name set is only a secondary fallback.
 */
function defIsPrivileged(def: RoleDefinition): boolean {
  const permissionPrivileged = def.properties.permissions.some((perm) =>
    (perm.actions ?? []).some(actionIsHighPrivilege),
  );
  if (permissionPrivileged) return true;
  return PRIVILEGED_ROLES.has(def.properties.roleName);
}

/**
 * Subscription RBAC least-privilege (ARM role assignments, not Graph) →
 * Role-based Access Controls. Flags excessive privileged assignments, wildcard
 * custom roles, and service principals holding privileged roles.
 */
export const rbacLeastPrivilegeCheck: IntegrationCheck = {
  id: 'azure-rbac-least-privilege',
  name: 'Azure RBAC — least privilege',
  description:
    'Flags excessive privileged role assignments, custom roles with wildcard permissions, and service principals with privileged roles.',
  service: 'entra-id',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;

    const [assignments, definitions] = await Promise.all([
      armListAllOrFail<RoleAssignment>(
        ctx,
        `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`,
        { what: 'role assignments', resourceType: 'azure-subscription', subscriptionId: sub },
      ),
      armListAllOrFail<RoleDefinition>(
        ctx,
        `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Authorization/roleDefinitions?api-version=2022-04-01`,
        { what: 'role definitions', resourceType: 'azure-subscription', subscriptionId: sub },
      ),
    ]);
    if (!assignments || !definitions) return;

    const defMap = new Map(definitions.map((d) => [d.id, d]));

    // Assignments can reference role definitions scoped to a management group or
    // resource group, which won't appear in the subscription-scope list above.
    // Resolve any missing definition directly so privileged principals aren't
    // undercounted. Cache by id to avoid refetching shared definitions.
    const resolvedDefs = new Map<string, RoleDefinition>();
    const resolveFailures: ReadFailure[] = [];
    const resolveDef = async (
      roleDefinitionId: string,
    ): Promise<RoleDefinition | null> => {
      const cached = defMap.get(roleDefinitionId) ?? resolvedDefs.get(roleDefinitionId);
      if (cached) return cached;
      try {
        const def = await ctx.fetch<RoleDefinition>(
          `${roleDefinitionId}?api-version=2022-04-01`,
        );
        if (def?.properties) {
          resolvedDefs.set(roleDefinitionId, def);
          return def;
        }
        return null;
      } catch (err) {
        const failure = toHttpReadFailure(err);
        resolveFailures.push(failure);
        ctx.warn('Failed to resolve Azure role definition for assignment', {
          roleDefinitionId,
          error: failure.error,
        });
        return null;
      }
    };

    const privileged: RoleAssignment[] = [];
    let unresolvedAssignments = 0;
    for (const a of assignments) {
      const def = await resolveDef(a.properties.roleDefinitionId);
      if (!def) {
        // Could not classify this assignment's role — do not silently treat it
        // as non-privileged (ERROR-READS-NEVER-SILENT-PASS).
        unresolvedAssignments++;
        continue;
      }
      if (defIsPrivileged(def)) privileged.push(a);
    }

    let violations = 0;

    if (unresolvedAssignments > 0) {
      violations++;
      ctx.fail({
        title: 'Could not verify all role assignments',
        description: `${unresolvedAssignments} role assignment(s) reference role definitions that could not be loaded (e.g. custom roles defined at management-group or resource-group scope), so their privilege level is unverified.`,
        resourceType: 'azure-subscription',
        resourceId: sub,
        severity: 'medium',
        remediation: remediationForReadFailure(
          combineReadFailures(resolveFailures),
          'Ensure the integration principal has read access to all role definitions in scope (including management-group and resource-group scopes), then re-run the check.',
        ),
        evidence: {
          unresolvedAssignments,
          // first few real errors so the cause is visible without log digging
          readErrors: resolveFailures.slice(0, 3).map((f) => f.error),
        },
      });
    }

    if (privileged.length > 5) {
      violations++;
      ctx.fail({
        title: 'Excessive privileged role assignments',
        description: `${privileged.length} principals hold privileged roles (Owner/Contributor/User Access Administrator). Limit to essential accounts.`,
        resourceType: 'azure-subscription',
        resourceId: sub,
        severity: 'high',
        remediation:
          'Review privileged role assignments and remove unnecessary ones; use just-in-time access via Azure PIM.',
        evidence: {
          privilegedCount: privileged.length,
          threshold: 5,
          principalIds: privileged.map((a) => a.properties.principalId),
          principalTypes: privileged.map((a) => a.properties.principalType),
        },
      });
    }

    const spPrivileged = privileged.filter(
      (a) => a.properties.principalType === 'ServicePrincipal',
    );
    if (spPrivileged.length > 0) {
      violations++;
      ctx.fail({
        title: 'Service principals with privileged roles',
        description: `${spPrivileged.length} service principal(s) hold privileged roles. Service principals should use least-privilege access.`,
        resourceType: 'azure-subscription',
        resourceId: sub,
        severity: 'medium',
        remediation:
          'Replace broad roles with scoped custom roles for service principals.',
        evidence: {
          count: spPrivileged.length,
          principalIds: spPrivileged.map((a) => a.properties.principalId),
        },
      });
    }

    // Inspect every role definition actually seen — the subscription-scope list
    // PLUS any out-of-scope definitions resolved from assignments above (e.g.
    // custom roles defined at a management group and assigned into this
    // subscription). Filtering only the subscription-scope `definitions` would
    // miss assigned MG/RG-scoped wildcard custom roles entirely. Dedupe by id.
    const allDefs = new Map<string, RoleDefinition>(
      definitions.map((d) => [d.id, d]),
    );
    for (const [id, def] of resolvedDefs) allDefs.set(id, def);

    const wildcardRoles = [...allDefs.values()].filter(
      (d) =>
        d.properties.type === 'CustomRole' &&
        d.properties.permissions.some(
          (perm) =>
            (perm.actions ?? []).some(isWildcardAction) ||
            (perm.dataActions ?? []).some(isWildcardAction),
        ),
    );
    for (const role of wildcardRoles) {
      violations++;
      const wildcardActions = role.properties.permissions.flatMap((perm) =>
        [...(perm.actions ?? []), ...(perm.dataActions ?? [])].filter(
          isWildcardAction,
        ),
      );
      ctx.fail({
        title: `Custom role with wildcard permissions: ${role.properties.roleName}`,
        description: `Custom role "${role.properties.roleName}" grants wildcard (*) permissions, which is overly permissive.`,
        resourceType: 'azure-role-definition',
        resourceId: role.id,
        severity: 'high',
        remediation:
          'Restrict the custom role to only the specific actions required.',
        evidence: { roleName: role.properties.roleName, wildcardActions },
      });
    }

    if (violations === 0) {
      ctx.pass({
        title: 'RBAC follows least privilege',
        description: `${privileged.length} privileged assignment(s); no wildcard custom roles or privileged service principals.`,
        resourceType: 'azure-subscription',
        resourceId: sub,
        evidence: {
          privilegedCount: privileged.length,
          threshold: 5,
          wildcardCustomRoles: wildcardRoles.length,
          privilegedServicePrincipals: spPrivileged.length,
          assignmentsEvaluated: assignments.length,
        },
      });
    }
  },
};

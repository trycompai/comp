import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { ARM_BASE, armListAll, resolveAzureSubscriptionId } from './shared';

interface RoleAssignment {
  properties: { roleDefinitionId: string; principalId: string; principalType: string };
}

interface RoleDefinition {
  id: string;
  properties: {
    roleName: string;
    type: string;
    permissions: Array<{ actions: string[] }>;
  };
}

const PRIVILEGED_ROLES = new Set([
  'Owner',
  'Contributor',
  'User Access Administrator',
  'Global Administrator',
  'Privileged Role Administrator',
]);

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
      armListAll<RoleAssignment>(
        ctx,
        `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`,
      ),
      armListAll<RoleDefinition>(
        ctx,
        `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Authorization/roleDefinitions?api-version=2022-04-01`,
      ),
    ]);

    const defMap = new Map(definitions.map((d) => [d.id, d]));
    const privileged = assignments.filter((a) => {
      const def = defMap.get(a.properties.roleDefinitionId);
      return def ? PRIVILEGED_ROLES.has(def.properties.roleName) : false;
    });

    let violations = 0;

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
        evidence: { count: privileged.length },
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
        evidence: { count: spPrivileged.length },
      });
    }

    const wildcardRoles = definitions.filter(
      (d) =>
        d.properties.type === 'CustomRole' &&
        d.properties.permissions.some((perm) =>
          perm.actions.some((act) => act === '*' || act.endsWith('/*')),
        ),
    );
    for (const role of wildcardRoles) {
      violations++;
      ctx.fail({
        title: `Custom role with wildcard permissions: ${role.properties.roleName}`,
        description: `Custom role "${role.properties.roleName}" grants wildcard (*) permissions, which is overly permissive.`,
        resourceType: 'azure-role-definition',
        resourceId: role.id,
        severity: 'high',
        remediation:
          'Restrict the custom role to only the specific actions required.',
        evidence: { roleName: role.properties.roleName },
      });
    }

    if (violations === 0) {
      ctx.pass({
        title: 'RBAC follows least privilege',
        description: `${privileged.length} privileged assignment(s); no wildcard custom roles or privileged service principals.`,
        resourceType: 'azure-subscription',
        resourceId: sub,
        evidence: { privilegedCount: privileged.length },
      });
    }
  },
};

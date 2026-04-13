import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface RoleAssignment {
  id: string;
  properties: {
    roleDefinitionId: string;
    principalId: string;
    principalType: string;
    scope: string;
    createdOn?: string;
  };
}

interface RoleDefinition {
  id: string;
  properties: {
    roleName: string;
    type: string; // 'BuiltInRole' | 'CustomRole'
    permissions: Array<{ actions: string[]; notActions: string[] }>;
  };
}

const PRIVILEGED_ROLES = new Set([
  'Owner',
  'Contributor',
  'User Access Administrator',
  'Global Administrator',
  'Privileged Role Administrator',
]);

export class EntraIdAdapter implements AzureServiceAdapter {
  readonly serviceId = 'entra-id';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const baseUrl = 'https://management.azure.com';

    // Fetch role assignments at subscription scope
    const assignments = await fetchAllPages<RoleAssignment>(
      accessToken,
      `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`,
    );

    // Fetch role definitions to resolve names
    const definitions = await fetchAllPages<RoleDefinition>(
      accessToken,
      `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions?api-version=2022-04-01`,
    );

    const defMap = new Map(definitions.map((d) => [d.id, d]));

    // Check 1: Count privileged role assignments
    const privilegedAssignments = assignments.filter((a) => {
      const def = defMap.get(a.properties.roleDefinitionId);
      return def && PRIVILEGED_ROLES.has(def.properties.roleName);
    });

    if (privilegedAssignments.length > 5) {
      findings.push({
        id: `azure-entra-excessive-privileged-${subscriptionId}`,
        title: 'Excessive Privileged Role Assignments',
        description: `${privilegedAssignments.length} principals have privileged roles (Owner, Contributor, User Access Administrator). Limit to essential accounts only.`,
        severity: 'high',
        resourceType: 'subscription',
        resourceId: subscriptionId,
        remediation: 'Review privileged role assignments and remove unnecessary ones. Use just-in-time access via Azure PIM.',
        evidence: {
          serviceId: this.serviceId,
          serviceName: 'Entra ID',
          findingKey: 'azure-entra-id-excessive-privileged-roles',
          count: privilegedAssignments.length,
          principals: privilegedAssignments.slice(0, 10).map((a) => ({
            principalId: a.properties.principalId,
            principalType: a.properties.principalType,
            role: defMap.get(a.properties.roleDefinitionId)?.properties.roleName,
          })),
        },
        createdAt: new Date().toISOString(),
      });
    } else {
      findings.push({
        id: `azure-entra-privileged-ok-${subscriptionId}`,
        title: 'Privileged Role Assignments',
        description: `${privilegedAssignments.length} privileged role assignments found — within acceptable range.`,
        severity: 'info',
        resourceType: 'subscription',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'Entra ID', findingKey: 'azure-entra-id-excessive-privileged-roles' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    // Check 2: Custom roles with wildcard actions
    const dangerousCustomRoles = definitions.filter((d) => {
      if (d.properties.type !== 'CustomRole') return false;
      return d.properties.permissions.some((p) =>
        p.actions.some((a) => a === '*' || a.endsWith('/*')),
      );
    });

    for (const role of dangerousCustomRoles) {
      findings.push({
        id: `azure-entra-wildcard-role-${role.id}`,
        title: `Custom Role with Wildcard Permissions: ${role.properties.roleName}`,
        description: `Custom role "${role.properties.roleName}" grants wildcard (*) permissions. This is overly permissive.`,
        severity: 'high',
        resourceType: 'role-definition',
        resourceId: role.id,
        remediation: 'Restrict custom role permissions to only the specific actions required.',
        evidence: {
          serviceId: this.serviceId,
          serviceName: 'Entra ID',
          findingKey: 'azure-entra-id-wildcard-custom-role',
          roleName: role.properties.roleName,
          permissions: role.properties.permissions,
        },
        createdAt: new Date().toISOString(),
      });
    }

    if (dangerousCustomRoles.length === 0) {
      findings.push({
        id: `azure-entra-custom-roles-ok-${subscriptionId}`,
        title: 'Custom Role Permissions',
        description: 'No custom roles with wildcard (*) permissions found.',
        severity: 'info',
        resourceType: 'subscription',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'Entra ID', findingKey: 'azure-entra-id-wildcard-custom-role' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    // Check 3: Service principals with Owner/Contributor
    const spWithPrivileged = privilegedAssignments.filter(
      (a) => a.properties.principalType === 'ServicePrincipal',
    );

    if (spWithPrivileged.length > 0) {
      findings.push({
        id: `azure-entra-sp-privileged-${subscriptionId}`,
        title: 'Service Principals with Privileged Roles',
        description: `${spWithPrivileged.length} service principal(s) have privileged roles. Service principals should use least-privilege access.`,
        severity: 'medium',
        resourceType: 'subscription',
        resourceId: subscriptionId,
        remediation: 'Replace broad roles with scoped custom roles for service principals.',
        evidence: {
          serviceId: this.serviceId,
          serviceName: 'Entra ID',
          findingKey: 'azure-entra-id-sp-privileged',
          count: spWithPrivileged.length,
        },
        createdAt: new Date().toISOString(),
      });
    }

    return findings;
  }
}

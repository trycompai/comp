/**
 * Azure IAM Access Review Check
 *
 * Reviews role assignments in the subscription to identify
 * privileged access and potential security risks.
 * Maps to: Access Review Log task
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { getAzureAccessToken, getRoleAssignments, getRoleDefinitions } from '../helpers';
import type { AzureRoleDefinition } from '../types';

// Built-in roles that grant significant privileges
const PRIVILEGED_ROLES = [
  'Owner',
  'Contributor',
  'User Access Administrator',
  'Security Admin',
  'Global Administrator',
];

export const iamAccessCheck: IntegrationCheck = {
  id: 'iam-access',
  name: 'Azure IAM Access Review',
  description: 'Review role assignments and identify privileged access in Azure',
  taskMapping: TASK_TEMPLATES.accessReviewLog,
  defaultSeverity: 'medium',
  variables: [],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Azure IAM Access Review check');

    const { tenantId, clientId, clientSecret, subscriptionId } = ctx.credentials;

    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      ctx.fail({
        title: 'Missing Azure credentials',
        resourceType: 'azure-config',
        resourceId: 'credentials',
        severity: 'critical',
        description: 'Azure credentials are not properly configured',
        remediation: 'Reconnect Azure with valid Service Principal credentials',
        evidence: {},
      });
      return;
    }

    let accessToken: string;
    try {
      accessToken = await getAzureAccessToken({
        tenantId,
        clientId,
        clientSecret,
        subscriptionId,
      });
    } catch (error) {
      ctx.fail({
        title: 'Azure authentication failed',
        resourceType: 'azure-auth',
        resourceId: subscriptionId,
        severity: 'critical',
        description: `Failed to authenticate with Azure: ${error instanceof Error ? error.message : String(error)}`,
        remediation: 'Verify the Service Principal credentials are correct',
        evidence: { error: String(error) },
      });
      return;
    }

    // Fetch role definitions to map IDs to names
    ctx.log('Fetching role definitions...');
    let roleDefinitions: AzureRoleDefinition[] = [];
    const roleNameMap = new Map<string, string>();

    try {
      roleDefinitions = await getRoleDefinitions(accessToken, subscriptionId);
      for (const def of roleDefinitions) {
        roleNameMap.set(def.id, def.properties.roleName);
      }
      ctx.log(`Loaded ${roleDefinitions.length} role definitions`);
    } catch (error) {
      ctx.warn(`Failed to fetch role definitions: ${error}`);
    }

    // Fetch role assignments
    ctx.log('Fetching role assignments...');
    try {
      const assignments = await getRoleAssignments(accessToken, subscriptionId);
      ctx.log(`Found ${assignments.length} role assignments`);

      const privilegedAssignments: Array<{
        principalId: string;
        principalType: string;
        roleName: string;
        scope: string;
      }> = [];

      const allAssignments: Array<{
        principalId: string;
        principalType: string;
        roleName: string;
        scope: string;
      }> = [];

      for (const assignment of assignments) {
        const roleName = roleNameMap.get(assignment.properties.roleDefinitionId) || 'Unknown Role';
        const assignmentInfo = {
          principalId: assignment.properties.principalId,
          principalType: assignment.properties.principalType,
          roleName,
          scope: assignment.properties.scope,
        };

        allAssignments.push(assignmentInfo);

        // Check if this is a privileged role
        if (PRIVILEGED_ROLES.some((pr) => roleName.includes(pr))) {
          privilegedAssignments.push(assignmentInfo);
        }
      }

      // Report privileged role assignments
      if (privilegedAssignments.length > 0) {
        // Group by principal type
        const byType = {
          users: privilegedAssignments.filter((a) => a.principalType === 'User'),
          servicePrincipals: privilegedAssignments.filter(
            (a) => a.principalType === 'ServicePrincipal',
          ),
          groups: privilegedAssignments.filter((a) => a.principalType === 'Group'),
        };

        ctx.pass({
          title: 'Privileged Role Assignments Inventory',
          resourceType: 'iam-privileged',
          resourceId: subscriptionId,
          description: `Found ${privilegedAssignments.length} privileged role assignments. Review these for least-privilege compliance.`,
          evidence: {
            totalPrivileged: privilegedAssignments.length,
            byPrincipalType: {
              users: byType.users.length,
              servicePrincipals: byType.servicePrincipals.length,
              groups: byType.groups.length,
            },
            privilegedAssignments: privilegedAssignments.slice(0, 20), // Limit to first 20
          },
        });

        // Flag any service principals with Owner/Contributor
        const riskyServicePrincipals = byType.servicePrincipals.filter(
          (sp) => sp.roleName === 'Owner' || sp.roleName === 'Contributor',
        );

        if (riskyServicePrincipals.length > 0) {
          ctx.fail({
            title: 'Service Principals with Owner/Contributor Role',
            resourceType: 'iam-service-principal',
            resourceId: subscriptionId,
            severity: 'medium',
            description: `${riskyServicePrincipals.length} service principals have Owner or Contributor role. Consider using more restrictive custom roles.`,
            remediation:
              'Review service principal permissions and apply least-privilege principle using custom roles where possible',
            evidence: {
              count: riskyServicePrincipals.length,
              servicePrincipals: riskyServicePrincipals,
            },
          });
        }
      }

      // Report total access summary
      ctx.pass({
        title: 'Azure IAM Access Summary',
        resourceType: 'iam-summary',
        resourceId: subscriptionId,
        description: `Subscription has ${assignments.length} total role assignments`,
        evidence: {
          totalAssignments: assignments.length,
          privilegedAssignments: privilegedAssignments.length,
          byPrincipalType: {
            users: allAssignments.filter((a) => a.principalType === 'User').length,
            servicePrincipals: allAssignments.filter((a) => a.principalType === 'ServicePrincipal')
              .length,
            groups: allAssignments.filter((a) => a.principalType === 'Group').length,
          },
        },
      });
    } catch (error) {
      ctx.fail({
        title: 'Failed to retrieve role assignments',
        resourceType: 'iam-access',
        resourceId: subscriptionId,
        severity: 'high',
        description: `Could not retrieve Azure role assignments: ${error instanceof Error ? error.message : String(error)}`,
        remediation: 'Verify the Service Principal has Reader role on the subscription',
        evidence: { error: String(error) },
      });
    }

    ctx.log('Azure IAM Access Review check complete');
  },
};

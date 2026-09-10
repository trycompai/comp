import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  filterGoogleWorkspaceUsersForChecks,
  parseGoogleWorkspaceCheckUserFilter,
  resolveGoogleWorkspaceUserFilter,
} from '../check-user-filter';
import type { GoogleWorkspaceUser, GoogleWorkspaceUsersResponse } from '../types';
import {
  fetchRoleAssignments,
  fetchRoleMap,
  resolveRoleAssignments,
  type ResolvedRoleGrant,
} from '../role-assignments';
import {
  includeSuspendedVariable,
  targetDomainsVariable,
  targetGroupsVariable,
  targetOrgUnitsVariable,
} from '../variables';

/**
 * Employee Access Review Check
 * Fetches all users from Google Workspace with their roles for access review.
 * Maps to: Access Review Log task
 */
export const employeeAccessCheck: IntegrationCheck = {
  id: 'employee-access',
  name: 'Employee Access Review',
  description: 'Fetch all employees and their roles from Google Workspace for access review',
  service: 'user-sync',
  taskMapping: TASK_TEMPLATES.employeeAccess,
  variables: [
    targetOrgUnitsVariable,
    targetGroupsVariable,
    targetDomainsVariable,
    includeSuspendedVariable,
  ],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Google Workspace Employee Access check');

    const userFilterConfig = await resolveGoogleWorkspaceUserFilter({
      client: ctx,
      config: parseGoogleWorkspaceCheckUserFilter(ctx.variables),
    });

    // Roles, assignments, then resolution. Group-assigned roles are expanded
    // to their members — assignments are not all user-scoped.
    ctx.log('Fetching roles and role assignments...');
    const roleMap = await fetchRoleMap(ctx);
    const assignments = await fetchRoleAssignments(ctx);
    ctx.log(`Fetched ${roleMap.size} roles and ${assignments.length} role assignments`);

    const { grantsByUserId, unresolvedGroupAssignments } = await resolveRoleAssignments({
      ctx,
      assignments,
      roleMap,
    });
    ctx.log(`Resolved admin roles for ${grantsByUserId.size} users`);

    if (unresolvedGroupAssignments.length > 0) {
      // Never let this pass silently: unexpanded group roles mean the review
      // under-reports who holds admin access, which is worse than a visible
      // finding on an otherwise all-pass inventory check.
      ctx.warn(
        `${unresolvedGroupAssignments.length} group-assigned role(s) could not be expanded`,
      );
      ctx.fail({
        title: 'Group-assigned admin roles could not be resolved',
        description:
          `${unresolvedGroupAssignments.length} admin role(s) are assigned to groups that Comp could not read. ` +
          'Users holding admin access through those groups are missing from this access review.',
        resourceType: 'connection',
        resourceId: ctx.connectionId,
        severity: 'medium',
        remediation:
          'Reconnect Google Workspace and approve the group directory permission (admin.directory.group.readonly) so group-assigned admin roles can be expanded.',
        evidence: { unresolvedGroupAssignments },
      });
    }

    // Fetch all users with pagination
    ctx.log('Fetching users...');
    const allUsers: GoogleWorkspaceUser[] = [];
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = {
        customer: 'my_customer',
        maxResults: '500',
        projection: 'full',
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await ctx.fetch<GoogleWorkspaceUsersResponse>('/admin/directory/v1/users', {
        params,
      });

      if (response.users) {
        allUsers.push(...response.users);
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Fetched ${allUsers.length} total users`);

    if (userFilterConfig.targetOrgUnits?.length) {
      const ouCounts = new Map<string, number>();
      for (const user of allUsers) {
        const ou = user.orgUnitPath ?? '/';
        ouCounts.set(ou, (ouCounts.get(ou) ?? 0) + 1);
      }
      ctx.log(
        `Filtering to OUs: ${userFilterConfig.targetOrgUnits.join(', ')}. ` +
          `User OUs: ${[...ouCounts.entries()].map(([ou, count]) => `${ou} (${count})`).join(', ')}`,
      );
    }

    // Same rules as 2FA check and employee sync (sync.controller.ts)
    const activeUsers = filterGoogleWorkspaceUsersForChecks(allUsers, userFilterConfig);

    ctx.log(`Found ${activeUsers.length} active users after filtering`);

    // Build the employee list with roles
    const employeeList = activeUsers.map((user) => {
      const grants: ResolvedRoleGrant[] = grantsByUserId.get(user.id) ?? [];
      const assignedRoles = grants.map((g) => g.roleName);
      const groupGrantedRoles = grants.filter((g) => g.source === 'group');

      // Derive a role description
      let role: string;
      if (user.isAdmin) {
        role = 'Super Admin';
      } else if (user.isDelegatedAdmin) {
        role = 'Delegated Admin';
      } else if (assignedRoles.length > 0) {
        role = assignedRoles.join(', ');
      } else {
        role = 'User';
      }

      return {
        email: user.primaryEmail,
        name: user.name.fullName,
        role,
        roles: assignedRoles.length > 0 ? assignedRoles : user.isAdmin ? ['Super Admin'] : ['User'],
        // Provenance matters for access review: a role held via group
        // membership is revoked by changing the group, not the user.
        roleGrants: grants,
        hasGroupGrantedRoles: groupGrantedRoles.length > 0,
        isAdmin: user.isAdmin,
        isDelegatedAdmin: user.isDelegatedAdmin,
        orgUnit: user.orgUnitPath,
        suspended: user.suspended,
        creationTime: user.creationTime,
        lastLoginTime: user.lastLoginTime,
      };
    });

    // Group users by role for the summary log
    const superAdmins = activeUsers.filter((u) => u.isAdmin);
    const delegatedAdmins = activeUsers.filter((u) => u.isDelegatedAdmin && !u.isAdmin);

    const checkedAt = new Date().toISOString();

    // No users after filtering is still a completed review — emit one org-level
    // row so the run never stores zero results (which would read as "no evidence").
    if (employeeList.length === 0) {
      ctx.pass({
        title: 'Employee Access List',
        resourceType: 'organization',
        resourceId: 'google-workspace',
        description: `No active users matched the configured filters (${allUsers.length} total user records inspected)`,
        evidence: { totalUsers: 0, inspectedUsers: allUsers.length, checkedAt },
      });
      ctx.log('Google Workspace Employee Access check complete: 0 users after filtering');
      return;
    }

    // One row per person (resourceType 'user', resourceId = lowercased email) so
    // person-scoped features can join results to org members by email. Access is
    // an inventory, not a violation — every person row emits as pass; error paths
    // keep their org-level rows.
    for (const employee of employeeList) {
      ctx.pass({
        title: 'Employee Access',
        resourceType: 'user',
        resourceId: employee.email.toLowerCase().trim(),
        description: `${employee.name} has access to Google Workspace as ${employee.role}`,
        evidence: { ...employee, checkedAt },
      });
    }

    ctx.log(
      `Google Workspace Employee Access check complete: ${employeeList.length} users (${superAdmins.length} super admins, ${delegatedAdmins.length} delegated admins)`,
    );
  },
};

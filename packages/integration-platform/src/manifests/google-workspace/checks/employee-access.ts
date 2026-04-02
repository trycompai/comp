import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  filterGoogleWorkspaceUsersForChecks,
  parseGoogleWorkspaceCheckUserFilter,
} from '../check-user-filter';
import type {
  GoogleWorkspaceRoleAssignmentsResponse,
  GoogleWorkspaceRolesResponse,
  GoogleWorkspaceUser,
  GoogleWorkspaceUsersResponse,
} from '../types';
import { includeSuspendedVariable, targetOrgUnitsVariable } from '../variables';

/**
 * Employee Access Review Check
 * Fetches all users from Google Workspace with their roles for access review.
 * Maps to: Access Review Log task
 */
export const employeeAccessCheck: IntegrationCheck = {
  id: 'employee-access',
  name: 'Employee Access Review',
  description: 'Fetch all employees and their roles from Google Workspace for access review',
  taskMapping: TASK_TEMPLATES.employeeAccess,
  variables: [targetOrgUnitsVariable, includeSuspendedVariable],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Google Workspace Employee Access check');

    const userFilterConfig = parseGoogleWorkspaceCheckUserFilter(ctx.variables);

    // Fetch all roles first to build a role ID -> name map
    ctx.log('Fetching available roles...');
    const roleMap = new Map<string, string>();

    try {
      let rolesPageToken: string | undefined;
      do {
        const params: Record<string, string> = { customer: 'my_customer' };
        if (rolesPageToken) {
          params.pageToken = rolesPageToken;
        }

        const rolesResponse = await ctx.fetch<GoogleWorkspaceRolesResponse>(
          '/admin/directory/v1/customer/my_customer/roles',
          { params },
        );

        if (rolesResponse.items) {
          for (const role of rolesResponse.items) {
            roleMap.set(role.roleId, role.roleName);
          }
        }

        rolesPageToken = rolesResponse.nextPageToken;
      } while (rolesPageToken);

      ctx.log(`Fetched ${roleMap.size} roles`);
    } catch (error) {
      ctx.log(
        'Could not fetch roles (may need additional permissions), continuing with basic info',
      );
    }

    // Fetch role assignments to map users to their roles
    ctx.log('Fetching role assignments...');
    const userRolesMap = new Map<string, string[]>(); // userId -> roleNames[]

    try {
      let assignmentsPageToken: string | undefined;
      do {
        const params: Record<string, string> = { customer: 'my_customer' };
        if (assignmentsPageToken) {
          params.pageToken = assignmentsPageToken;
        }

        const assignmentsResponse = await ctx.fetch<GoogleWorkspaceRoleAssignmentsResponse>(
          '/admin/directory/v1/customer/my_customer/roleassignments',
          { params },
        );

        if (assignmentsResponse.items) {
          for (const assignment of assignmentsResponse.items) {
            const roleName = roleMap.get(assignment.roleId) || `Role ${assignment.roleId}`;
            const existing = userRolesMap.get(assignment.assignedTo) || [];
            existing.push(roleName);
            userRolesMap.set(assignment.assignedTo, existing);
          }
        }

        assignmentsPageToken = assignmentsResponse.nextPageToken;
      } while (assignmentsPageToken);

      ctx.log(`Fetched ${userRolesMap.size} user role assignments`);
    } catch (error) {
      ctx.log(
        'Could not fetch role assignments (may need additional permissions), continuing with basic admin status',
      );
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
      // Get assigned roles from the role assignments
      const assignedRoles = userRolesMap.get(user.id) || [];

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
        isAdmin: user.isAdmin,
        isDelegatedAdmin: user.isDelegatedAdmin,
        orgUnit: user.orgUnitPath,
        suspended: user.suspended,
        creationTime: user.creationTime,
        lastLoginTime: user.lastLoginTime,
      };
    });

    // Group users by role for summary
    const superAdmins = activeUsers.filter((u) => u.isAdmin);
    const delegatedAdmins = activeUsers.filter((u) => u.isDelegatedAdmin && !u.isAdmin);
    const regularUsers = activeUsers.filter((u) => !u.isAdmin && !u.isDelegatedAdmin);

    // Pass with the full employee list as evidence
    ctx.pass({
      title: 'Employee Access List',
      resourceType: 'organization',
      resourceId: 'google-workspace',
      description: `Retrieved ${activeUsers.length} employees from Google Workspace (${superAdmins.length} super admins, ${delegatedAdmins.length} delegated admins, ${regularUsers.length} regular users)`,
      evidence: {
        totalUsers: activeUsers.length,
        superAdminCount: superAdmins.length,
        delegatedAdminCount: delegatedAdmins.length,
        regularUserCount: regularUsers.length,
        reviewedAt: new Date().toISOString(),
        employees: employeeList,
      },
    });

    ctx.log('Google Workspace Employee Access check complete');
  },
};

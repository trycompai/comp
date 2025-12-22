import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import type { JumpCloudEmployee, JumpCloudUser, JumpCloudUsersResponse } from '../types';
import { includeSuspendedVariable } from '../variables';

/**
 * Helper to determine user status from JumpCloud state
 */
const getUserStatus = (user: JumpCloudUser): 'active' | 'suspended' | 'staged' => {
  if (user.suspended) return 'suspended';
  if (user.state === 'STAGED') return 'staged';
  if (user.state === 'ACTIVATED' && user.activated) return 'active';
  return 'suspended';
};

/**
 * Helper to build full name from user data
 */
const getFullName = (user: JumpCloudUser): string => {
  if (user.displayname) return user.displayname;
  const parts = [user.firstname, user.lastname].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return user.username;
};

/**
 * Employee Sync Check
 *
 * Fetches all users from JumpCloud and syncs them as employees.
 * This provides a complete list of team members for access review and compliance.
 */
export const employeeSyncCheck: IntegrationCheck = {
  id: 'employee-sync',
  name: 'Employee Sync',
  description: 'Sync users from JumpCloud as employees for access review and verification',
  taskMapping: TASK_TEMPLATES.employeeAccess,
  defaultSeverity: 'info',
  variables: [includeSuspendedVariable],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting JumpCloud Employee Sync');

    const includeSuspended = ctx.variables.include_suspended === 'true';

    // JumpCloud API v1 uses pagination with limit/skip
    const allUsers: JumpCloudUser[] = [];
    const limit = 100;
    let skip = 0;
    let hasMore = true;

    ctx.log('Fetching users from JumpCloud...');

    while (hasMore) {
      // Note: path must NOT start with / when using baseUrl, otherwise URL constructor
      // treats it as absolute from domain root
      const response = await ctx.fetch<JumpCloudUsersResponse>('systemusers', {
        baseUrl: 'https://console.jumpcloud.com/api/',
        params: {
          limit: String(limit),
          skip: String(skip),
          sort: 'email',
        },
      });

      if (response.results && response.results.length > 0) {
        allUsers.push(...response.results);
        skip += response.results.length;

        // Check if we've fetched all users
        if (response.results.length < limit || skip >= response.totalCount) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      ctx.log(`Fetched ${allUsers.length} of ${response.totalCount} users`);
    }

    ctx.log(`Fetched ${allUsers.length} total users from JumpCloud`);

    // Filter users based on configuration
    const filteredUsers = allUsers.filter((user) => {
      // Always exclude staged users (not yet activated)
      if (user.state === 'STAGED') return false;

      // Include/exclude suspended users based on variable
      if (user.suspended && !includeSuspended) return false;

      return true;
    });

    ctx.log(`Found ${filteredUsers.length} users after filtering`);

    // Build manager lookup map
    const userById = new Map(allUsers.map((u) => [u._id, u]));

    // Transform to employee format
    const employees: JumpCloudEmployee[] = filteredUsers.map((user) => ({
      id: user._id,
      email: user.email,
      name: getFullName(user),
      firstName: user.firstname,
      lastName: user.lastname,
      username: user.username,
      jobTitle: user.jobTitle,
      department: user.department,
      employeeType: user.employeeType,
      managerId: user.manager,
      status: getUserStatus(user),
      mfaEnabled: user.mfa?.configured ?? user.totp_enabled ?? false,
      isAdmin: user.sudo ?? false,
      createdAt: user.created,
    }));

    // Calculate statistics
    const activeUsers = employees.filter((e) => e.status === 'active');
    const suspendedUsers = employees.filter((e) => e.status === 'suspended');
    const mfaEnabled = employees.filter((e) => e.mfaEnabled);
    const admins = employees.filter((e) => e.isAdmin);

    // Group by department for summary
    const departmentCounts = new Map<string, number>();
    for (const emp of employees) {
      const dept = emp.department || 'No Department';
      departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1);
    }

    const departmentSummary = Array.from(departmentCounts.entries())
      .map(([name, count]) => ({ department: name, count }))
      .sort((a, b) => b.count - a.count);

    // Build employee list with manager names resolved
    const employeeList = employees.map((emp) => {
      let managerName: string | undefined;
      if (emp.managerId) {
        const manager = userById.get(emp.managerId);
        if (manager) {
          managerName = getFullName(manager);
        }
      }

      return {
        ...emp,
        managerName,
      };
    });

    // Pass with the full employee list as evidence
    ctx.pass({
      title: 'JumpCloud Employee List',
      resourceType: 'organization',
      resourceId: 'jumpcloud',
      description: `Retrieved ${employees.length} employees from JumpCloud (${activeUsers.length} active, ${suspendedUsers.length} suspended, ${admins.length} admins, ${mfaEnabled.length} with MFA)`,
      evidence: {
        totalUsers: employees.length,
        activeCount: activeUsers.length,
        suspendedCount: suspendedUsers.length,
        adminCount: admins.length,
        mfaEnabledCount: mfaEnabled.length,
        departmentSummary,
        reviewedAt: new Date().toISOString(),
        employees: employeeList,
      },
    });

    ctx.log('JumpCloud Employee Sync complete');
  },
};

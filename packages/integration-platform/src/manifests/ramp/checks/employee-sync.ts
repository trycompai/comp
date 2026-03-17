import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import type {
  RampUser,
  RampEmployee,
  RampUserStatus,
  RampUsersResponse,
} from '../types';

const getUserStatus = (
  user: RampUser,
): RampEmployee['status'] => {
  switch (user.status) {
    case 'USER_ACTIVE':
      return 'active';
    case 'USER_INACTIVE':
      return 'inactive';
    case 'USER_SUSPENDED':
      return 'suspended';
    case 'USER_ONBOARDING':
      return 'onboarding';
    case 'INVITE_PENDING':
      return 'invite_pending';
    case 'INVITE_EXPIRED':
      return 'invite_expired';
    default:
      return 'inactive';
  }
};

const getFullName = (user: RampUser): string => {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return user.email?.split('@')[0] ?? 'Unknown';
};

/**
 * Employee Sync Check
 *
 * Fetches all users from Ramp and provides evidence for audit trail.
 * This gives auditors a complete snapshot of the employee roster.
 */
export const employeeSyncCheck: IntegrationCheck = {
  id: 'employee-sync',
  name: 'Employee Sync',
  description:
    'Sync users from Ramp as employees for access review and verification',
  taskMapping: TASK_TEMPLATES.employeeAccess,
  defaultSeverity: 'info',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Ramp Employee Sync');

    const allUsers: RampUser[] = [];

    // Fetch active + inactive users (default behavior)
    ctx.log('Fetching users from Ramp...');

    const fetchAllRampUsers = async (
      initialPath: string,
    ): Promise<RampUser[]> => {
      const result: RampUser[] = [];
      let currentUrl: string | null = initialPath;
      let isFirst = true;

      while (currentUrl) {
        const response: RampUsersResponse = await ctx.fetch<RampUsersResponse>(
          currentUrl,
          isFirst ? { baseUrl: 'https://demo-api.ramp.com' } : undefined,
        );
        isFirst = false;

        if (response.data?.length) {
          result.push(...response.data);
        }

        currentUrl = response.page?.next ?? null;
      }

      return result;
    };

    const baseUsers = await fetchAllRampUsers(
      '/developer/v1/users?page_size=100',
    );
    allUsers.push(...baseUsers);
    ctx.log(`Fetched ${baseUsers.length} active/inactive users`);

    // Also fetch suspended users (not included by default)
    const suspendedUsers = await fetchAllRampUsers(
      '/developer/v1/users?page_size=100&status=USER_SUSPENDED',
    );
    allUsers.push(...suspendedUsers);
    ctx.log(`Fetched ${suspendedUsers.length} suspended users`);

    ctx.log(`Fetched ${allUsers.length} total users from Ramp`);

    // Filter out non-syncable statuses
    const syncableStatuses = new Set<RampUserStatus>([
      'USER_ACTIVE',
      'USER_INACTIVE',
      'USER_SUSPENDED',
    ]);
    const syncableUsers = allUsers.filter(
      (u) => u.status && syncableStatuses.has(u.status),
    );

    // Transform to employee format
    const employees: RampEmployee[] = syncableUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: getFullName(user),
      firstName: user.first_name,
      lastName: user.last_name,
      employeeId: user.employee_id,
      status: getUserStatus(user),
      role: user.role,
      departmentId: user.department_id,
      locationId: user.location_id,
      managerId: user.manager_id,
      phone: user.phone,
      isManager: user.is_manager,
    }));

    // Calculate statistics
    const activeEmployees = employees.filter((e) => e.status === 'active');
    const inactiveEmployees = employees.filter((e) => e.status === 'inactive');
    const suspendedEmployees = employees.filter(
      (e) => e.status === 'suspended',
    );
    const managers = employees.filter((e) => e.isManager);

    // Group by role for summary
    const roleCounts = new Map<string, number>();
    for (const emp of employees) {
      const role = emp.role || 'Unknown';
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    }

    const roleSummary = Array.from(roleCounts.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    ctx.pass({
      title: 'Ramp Employee List',
      resourceType: 'organization',
      resourceId: 'ramp',
      description: `Retrieved ${employees.length} employees from Ramp (${activeEmployees.length} active, ${inactiveEmployees.length} inactive, ${suspendedEmployees.length} suspended, ${managers.length} managers)`,
      evidence: {
        totalUsers: employees.length,
        activeCount: activeEmployees.length,
        inactiveCount: inactiveEmployees.length,
        suspendedCount: suspendedEmployees.length,
        managerCount: managers.length,
        roleSummary,
        reviewedAt: new Date().toISOString(),
        employees,
      },
    });

    ctx.log('Ramp Employee Sync complete');
  },
};

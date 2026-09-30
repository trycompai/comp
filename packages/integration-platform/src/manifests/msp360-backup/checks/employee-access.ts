import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { bearerHeaders, loginBackup } from '../auth';
import type { Msp360Admin } from '../types';

function asAdminList(payload: unknown): Msp360Admin[] {
  if (Array.isArray(payload)) {
    return payload as Msp360Admin[];
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'items', 'Administrators']) {
      if (Array.isArray(record[key])) {
        return record[key] as Msp360Admin[];
      }
    }
  }
  return [];
}

function adminEmail(admin: Msp360Admin, index: number): string {
  const email = (admin.Email ?? '').trim();
  return email ? email.toLowerCase() : `admin-${admin.AdminID ?? index}`;
}

/**
 * Staff access = GET /api/Administrators only.
 * GET /api/Users is backup customers and must never be treated as employees.
 */
export const employeeAccessCheck: IntegrationCheck = {
  id: 'employee-access',
  name: 'MSP360 Backup administrators',
  description:
    'List Managed Backup console administrators (staff). Does not call GET /api/Users (those are backup customers).',
  service: 'user-sync',
  taskMapping: TASK_TEMPLATES.employeeAccess,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting MSP360 Backup employee-access check (Administrators only)');

    const session = await loginBackup(ctx);
    if (!session) {
      return;
    }

    let payload: unknown;
    try {
      payload = await ctx.fetch<unknown>('/api/Administrators', {
        baseUrl: session.baseUrl,
        headers: bearerHeaders(session.token),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'Failed to list MSP360 administrators',
        description: 'GET /api/Administrators failed. Employee access evidence requires this roster.',
        resourceType: 'connection',
        resourceId: 'msp360-backup-admins',
        severity: 'high',
        remediation:
          'Grant the API user permission to list administrators. Do not substitute GET /api/Users — that list is customers, not staff.',
        evidence: { error: message },
      });
      return;
    }

    const admins = asAdminList(payload);
    const checkedAt = new Date().toISOString();

    if (admins.length === 0) {
      ctx.fail({
        title: 'No MSP360 administrators returned',
        description: 'GET /api/Administrators returned an empty list.',
        resourceType: 'connection',
        resourceId: 'msp360-backup-admins',
        severity: 'medium',
        remediation: 'Confirm the API user can see administrator accounts in the management console.',
        evidence: { checkedAt },
      });
      return;
    }

    for (const [index, admin] of admins.entries()) {
      const email = adminEmail(admin, index);
      const name = `${admin.FirstName ?? ''} ${admin.LastName ?? ''}`.trim() || email;
      const enabled = admin.Enabled !== false;
      ctx.pass({
        title: 'Employee Access',
        resourceType: 'user',
        resourceId: email,
        description: `${name} is an MSP360 Backup administrator (${enabled ? 'enabled' : 'disabled'}). Disabled admins are still listed for an honest roster.`,
        evidence: {
          email: admin.Email,
          firstName: admin.FirstName,
          lastName: admin.LastName,
          enabled,
          lastLogin: admin.LastLogin,
          dateCreated: admin.DateCreated,
          companies: admin.Companies,
          permissions: admin.PermissionsModels,
          source: 'GET /api/Administrators',
          checkedAt,
        },
      });
    }

    ctx.log(`MSP360 Backup employee-access complete: ${admins.length} administrators`);
  },
};

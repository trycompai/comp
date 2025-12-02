import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import type { GoogleWorkspaceUsersResponse } from '../types';

/**
 * Review admin users in Google Workspace
 * Maps to: Access Review Log task
 */
export const adminUsersCheck: IntegrationCheck = {
  id: 'admin-users',
  name: 'Admin Users Review',
  description: 'Review all users with admin privileges in Google Workspace',
  taskMapping: TASK_TEMPLATES.accessReviewLog,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Google Workspace admin users review');

    // Fetch admin users
    const params: Record<string, string> = {
      customer: 'my_customer',
      maxResults: '500',
      projection: 'full',
      query: 'isAdmin=true',
    };

    const response = await ctx.fetch<GoogleWorkspaceUsersResponse>(
      '/admin/directory/v1/users',
      { params },
    );

    const adminUsers = response.users || [];
    ctx.log(`Found ${adminUsers.length} admin users`);

    if (adminUsers.length === 0) {
      ctx.pass({
        title: 'No Admin Users Found',
        resourceType: 'organization',
        resourceId: 'google-workspace',
        description: 'No admin users found in Google Workspace (this may indicate an API issue)',
        evidence: { note: 'No admin users returned from API' },
      });
      return;
    }

    // Report each admin for review
    for (const user of adminUsers) {
      const isSuperAdmin = user.isAdmin && !user.isDelegatedAdmin;
      const adminType = isSuperAdmin ? 'Super Admin' : 'Delegated Admin';

      ctx.pass({
        title: `${adminType}: ${user.name.fullName}`,
        resourceType: 'admin-user',
        resourceId: user.primaryEmail,
        description: `${adminType} account requires periodic review`,
        evidence: {
          email: user.primaryEmail,
          name: user.name.fullName,
          adminType,
          isSuperAdmin,
          isDelegatedAdmin: user.isDelegatedAdmin,
          is2FAEnabled: user.isEnrolledIn2Sv,
          orgUnit: user.orgUnitPath,
          createdAt: user.creationTime,
          lastLogin: user.lastLoginTime,
          suspended: user.suspended,
        },
      });

      // Flag if admin doesn't have 2FA
      if (!user.isEnrolledIn2Sv) {
        ctx.fail({
          title: `${adminType} without 2FA`,
          resourceType: 'admin-user',
          resourceId: user.primaryEmail,
          severity: 'high',
          description: `${adminType} ${user.name.fullName} does not have 2-Step Verification enabled`,
          remediation: 'Immediately enable 2FA for this admin account. Admin accounts are high-value targets.',
          evidence: {
            email: user.primaryEmail,
            name: user.name.fullName,
            adminType,
          },
        });
      }
    }

    ctx.log('Google Workspace admin users review complete');
  },
};


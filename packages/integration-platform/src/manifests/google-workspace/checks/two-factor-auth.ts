import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import type { GoogleWorkspaceUser, GoogleWorkspaceUsersResponse } from '../types';
import { includeSuspendedVariable, targetOrgUnitsVariable } from '../variables';

/**
 * Check that all users have 2-Step Verification enabled
 * Maps to: 2FA task
 */
export const twoFactorAuthCheck: IntegrationCheck = {
  id: 'two-factor-auth',
  name: '2-Step Verification Enabled',
  description: 'Verify all users have 2-Step Verification (2FA) enabled in Google Workspace',
  taskMapping: TASK_TEMPLATES['2fa'],
  variables: [targetOrgUnitsVariable, includeSuspendedVariable],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Google Workspace 2FA check');

    const targetOrgUnits = ctx.variables.target_org_units as string[] | undefined;
    const includeSuspended = ctx.variables.include_suspended === 'true';

    // Fetch all users with pagination
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

    // Filter users based on settings
    const usersToCheck = allUsers.filter((user) => {
      // Skip suspended users unless explicitly included
      if (user.suspended && !includeSuspended) {
        return false;
      }

      // Skip archived users
      if (user.archived) {
        return false;
      }

      // Filter by org unit if specified
      if (targetOrgUnits && targetOrgUnits.length > 0) {
        return targetOrgUnits.some(
          (ou) => user.orgUnitPath === ou || user.orgUnitPath.startsWith(`${ou}/`),
        );
      }

      return true;
    });

    ctx.log(`Checking ${usersToCheck.length} users after filtering`);

    // Check each user's 2FA status
    for (const user of usersToCheck) {
      if (user.isEnrolledIn2Sv) {
        ctx.pass({
          title: '2FA Enabled',
          resourceType: 'user',
          resourceId: user.primaryEmail,
          description: `User ${user.name.fullName} has 2-Step Verification enabled`,
          evidence: {
            email: user.primaryEmail,
            name: user.name.fullName,
            isEnrolledIn2Sv: user.isEnrolledIn2Sv,
            isEnforcedIn2Sv: user.isEnforcedIn2Sv,
            isAdmin: user.isAdmin,
            orgUnit: user.orgUnitPath,
            lastLogin: user.lastLoginTime,
          },
        });
      } else {
        ctx.fail({
          title: '2FA Not Enabled',
          resourceType: 'user',
          resourceId: user.primaryEmail,
          severity: user.isAdmin ? 'high' : 'medium',
          description: `User ${user.name.fullName} does not have 2-Step Verification enabled`,
          remediation: user.isEnforcedIn2Sv
            ? 'User is required to enable 2FA but has not completed enrollment. Follow up with user to complete setup.'
            : 'Enable 2FA enforcement for this user or organizational unit in Google Admin Console.',
          evidence: {
            email: user.primaryEmail,
            name: user.name.fullName,
            isEnrolledIn2Sv: user.isEnrolledIn2Sv,
            isEnforcedIn2Sv: user.isEnforcedIn2Sv,
            isAdmin: user.isAdmin,
            orgUnit: user.orgUnitPath,
            lastLogin: user.lastLoginTime,
          },
        });
      }
    }

    ctx.log('Google Workspace 2FA check complete');
  },
};

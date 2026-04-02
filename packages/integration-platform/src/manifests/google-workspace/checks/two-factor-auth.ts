import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  filterGoogleWorkspaceUsersForChecks,
  parseGoogleWorkspaceCheckUserFilter,
} from '../check-user-filter';
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
  taskMapping: TASK_TEMPLATES.twoFactorAuth,
  variables: [targetOrgUnitsVariable, includeSuspendedVariable],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Google Workspace 2FA check');

    const userFilterConfig = parseGoogleWorkspaceCheckUserFilter(ctx.variables);

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

    // Org units + sync email filter — same rules as employee sync (sync.controller.ts)
    const usersToCheck = filterGoogleWorkspaceUsersForChecks(allUsers, userFilterConfig);

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

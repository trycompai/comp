/**
 * Two-Factor Authentication Check
 * Verifies that all members of the GitHub organization have 2FA enabled.
 * Uses the /orgs/{org}/members?filter=2fa_disabled endpoint to find
 * members without 2FA configured.
 */

import type { IntegrationCheck } from '../../../types';
import type { GitHubOrg, GitHubOrgMember } from '../types';

export const twoFactorAuthCheck: IntegrationCheck = {
  id: 'two_factor_auth',
  name: '2FA Enabled for All Members',
  description:
    'Verify that all organization members have two-factor authentication enabled',
  defaultSeverity: 'high',

  run: async (ctx) => {
    const orgs = await ctx.fetch<GitHubOrg[]>('/user/orgs');

    if (orgs.length === 0) {
      ctx.warn('No organizations found for this GitHub connection');
      return;
    }

    for (const org of orgs) {
      let membersWithout2FA: GitHubOrgMember[] = [];

      try {
        // This endpoint requires org admin access
        membersWithout2FA = await ctx.fetchAllPages<GitHubOrgMember>(
          `/orgs/${org.login}/members?filter=2fa_disabled`,
        );
      } catch (error) {
        const errorStr = String(error);
        // 403 means we don't have org admin access to check 2FA status
        if (
          errorStr.includes('403') ||
          errorStr.includes('Forbidden') ||
          errorStr.includes('SAML')
        ) {
          ctx.log(
            `Skipping 2FA check for ${org.login} (requires org admin access)`,
          );
          continue;
        }
        throw error;
      }

      // Get total member count for evidence
      let totalMembers: GitHubOrgMember[] = [];
      try {
        totalMembers = await ctx.fetchAllPages<GitHubOrgMember>(
          `/orgs/${org.login}/members`,
        );
      } catch {
        // If we can't get total, just use the 2FA-disabled list
      }

      const totalCount = totalMembers.length;
      const disabledCount = membersWithout2FA.length;
      const enabledCount = totalCount - disabledCount;

      if (disabledCount === 0) {
        ctx.pass({
          title: `All members have 2FA enabled in ${org.login}`,
          description: `All ${totalCount} member${totalCount !== 1 ? 's' : ''} in the ${org.login} organization have two-factor authentication enabled.`,
          resourceType: 'organization',
          resourceId: org.login,
          evidence: {
            [org.login]: {
              total_members: totalCount,
              members_with_2fa: enabledCount,
              members_without_2fa: 0,
              checked_at: new Date().toISOString(),
            },
          },
        });
      } else {
        const disabledLogins = membersWithout2FA
          .map((m) => m.login)
          .slice(0, 20); // Cap at 20 for readability

        ctx.fail({
          title: `${disabledCount} member${disabledCount !== 1 ? 's' : ''} without 2FA in ${org.login}`,
          description: `${disabledCount} of ${totalCount} member${totalCount !== 1 ? 's' : ''} in the ${org.login} organization do not have two-factor authentication enabled: ${disabledLogins.join(', ')}${disabledCount > 20 ? ` and ${disabledCount - 20} more` : ''}.`,
          resourceType: 'organization',
          resourceId: org.login,
          severity: 'high',
          remediation: `1. Go to https://github.com/organizations/${org.login}/settings/security\n2. Enable "Require two-factor authentication" for the organization\n3. Notify affected members (${disabledLogins.join(', ')}) to set up 2FA on their accounts`,
          evidence: {
            [org.login]: {
              total_members: totalCount,
              members_with_2fa: enabledCount,
              members_without_2fa: disabledCount,
              members_without_2fa_logins: disabledLogins,
              checked_at: new Date().toISOString(),
            },
          },
        });
      }
    }
  },
};

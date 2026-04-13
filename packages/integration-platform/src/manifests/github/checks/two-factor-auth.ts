/**
 * Two-Factor Authentication Check
 * Verifies that all organization members have 2FA enabled.
 *
 * Uses GET /orgs/{org}/members?filter=2fa_disabled to find members
 * without 2FA. Requires the 'admin:org' OAuth scope.
 *
 * @see https://docs.github.com/en/rest/orgs/members#list-organization-members
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { GitHubOrg } from '../types';

interface GitHubOrgMember {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
  site_admin: boolean;
}

export const twoFactorAuthCheck: IntegrationCheck = {
  id: 'two_factor_auth',
  name: '2FA Enforcement',
  description:
    'Verify that all GitHub organization members have two-factor authentication enabled',
  taskMapping: TASK_TEMPLATES.twoFactorAuth,
  defaultSeverity: 'high',

  variables: [],

  run: async (ctx) => {
    // Step 1: Get all orgs the authenticated user belongs to
    let orgs: GitHubOrg[];
    try {
      orgs = await ctx.fetchAllPages<GitHubOrg>('/user/orgs');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      ctx.error(`Failed to fetch organizations: ${errorMsg}`);
      ctx.fail({
        title: 'Cannot fetch GitHub organizations',
        description: `Failed to list organizations: ${errorMsg}`,
        resourceType: 'organization',
        resourceId: 'github',
        severity: 'medium',
        remediation:
          'Ensure the GitHub integration has the read:org scope. You may need to reconnect the integration.',
      });
      return;
    }

    if (orgs.length === 0) {
      ctx.fail({
        title: 'No GitHub organizations found',
        description:
          'The connected GitHub account is not a member of any organizations. 2FA enforcement is an organization-level setting.',
        resourceType: 'organization',
        resourceId: 'github',
        severity: 'low',
        remediation:
          'Connect a GitHub account that belongs to at least one organization.',
      });
      return;
    }

    ctx.log(`Found ${orgs.length} organization(s). Checking 2FA status...`);

    // Step 2: For each org, check for members without 2FA
    for (const org of orgs) {
      ctx.log(`Checking 2FA for organization: ${org.login}`);

      let membersWithout2FA: GitHubOrgMember[];
      try {
        membersWithout2FA = await ctx.fetchAllPages<GitHubOrgMember>(
          `/orgs/${org.login}/members?filter=2fa_disabled`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        // 403/422 usually means the token lacks admin:org scope or user isn't an org owner
        if (
          errorMsg.includes('403') ||
          errorMsg.includes('422') ||
          errorMsg.includes('Forbidden') ||
          errorMsg.includes('Unprocessable')
        ) {
          ctx.warn(
            `Cannot check 2FA for ${org.login}: insufficient permissions. The admin:org scope and org owner/admin role are required.`,
          );
          ctx.fail({
            title: `Cannot verify 2FA for ${org.login}`,
            description: `Insufficient permissions to check 2FA status. The filter=2fa_disabled parameter requires the admin:org OAuth scope and the authenticated user must be an organization owner or admin.`,
            resourceType: 'organization',
            resourceId: org.login,
            severity: 'medium',
            remediation: `Reconnect the GitHub integration with an organization owner account. The integration will request the admin:org scope needed to check 2FA status.`,
          });
          continue;
        }

        ctx.error(`Failed to check 2FA for ${org.login}: ${errorMsg}`);
        ctx.fail({
          title: `Error checking 2FA for ${org.login}`,
          description: `Failed to query members without 2FA: ${errorMsg}`,
          resourceType: 'organization',
          resourceId: org.login,
          severity: 'medium',
          remediation: 'Check the integration connection and try again.',
        });
        continue;
      }

      // Step 3: Also fetch total member count for context
      let totalMembers: GitHubOrgMember[];
      try {
        totalMembers = await ctx.fetchAllPages<GitHubOrgMember>(
          `/orgs/${org.login}/members`,
        );
      } catch {
        // Non-critical: we can still report 2FA findings without total count
        totalMembers = [];
      }

      const totalCount = totalMembers.length;
      const without2FACount = membersWithout2FA.length;

      if (without2FACount === 0) {
        ctx.pass({
          title: `All members have 2FA enabled in ${org.login}`,
          description:
            totalCount > 0
              ? `All ${totalCount} members of the ${org.login} organization have two-factor authentication enabled.`
              : `No members without 2FA found in the ${org.login} organization.`,
          resourceType: 'organization',
          resourceId: org.login,
          evidence: {
            organization: org.login,
            totalMembers: totalCount,
            membersWithout2FA: 0,
            checkedAt: new Date().toISOString(),
          },
        });
      } else {
        // List each member without 2FA as a separate finding
        for (const member of membersWithout2FA) {
          ctx.fail({
            title: `2FA not enabled: ${member.login}`,
            description: `GitHub user @${member.login} in the ${org.login} organization does not have two-factor authentication enabled.`,
            resourceType: 'user',
            resourceId: `${org.login}/${member.login}`,
            severity: 'high',
            remediation: `Ask @${member.login} to enable 2FA in their GitHub account settings (Settings > Password and authentication > Two-factor authentication). Alternatively, enforce 2FA at the organization level in ${org.login}'s settings.`,
            evidence: {
              organization: org.login,
              username: member.login,
              userId: member.id,
              profileUrl: member.html_url,
              checkedAt: new Date().toISOString(),
            },
          });
        }

        // Also emit a summary
        ctx.fail({
          title: `${without2FACount} member(s) without 2FA in ${org.login}`,
          description: `${without2FACount} out of ${totalCount || 'unknown'} members in the ${org.login} organization do not have two-factor authentication enabled: ${membersWithout2FA.map((m) => `@${m.login}`).join(', ')}`,
          resourceType: 'organization',
          resourceId: `${org.login}/2fa-summary`,
          severity: 'high',
          remediation: `1. Go to https://github.com/organizations/${org.login}/settings/security\n2. Under "Authentication security", check "Require two-factor authentication for everyone"\n3. This will require all existing and future members to enable 2FA`,
          evidence: {
            organization: org.login,
            totalMembers: totalCount,
            membersWithout2FA: without2FACount,
            usernames: membersWithout2FA.map((m) => m.login),
            checkedAt: new Date().toISOString(),
          },
        });
      }
    }
  },
};

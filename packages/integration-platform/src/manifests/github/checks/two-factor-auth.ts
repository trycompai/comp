/**
 * Two-Factor Authentication Check
 * Verifies that all organization members have 2FA enabled.
 *
 * Uses GET /orgs/{org}/members?filter=2fa_disabled to find members
 * without 2FA. The filter is only available to organization owners.
 *
 * @see https://docs.github.com/en/rest/orgs/members#list-organization-members
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { GitHubOrg } from '../types';

interface GitHubOrgMember {
  login: string;
  id: number;
  html_url: string;
}

const getHttpStatus = (error: unknown): number | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }
  return null;
};

const isOwnerPermissionError = (error: unknown, errorMsg: string): boolean => {
  const status = getHttpStatus(error);
  const lower = errorMsg.toLowerCase();

  // GitHub documents 422 when 2fa_* filters are used in unsupported contexts.
  if (status === 422) return true;

  if (lower.includes('must be an organization owner') || lower.includes('organization owners')) {
    return true;
  }

  if (
    lower.includes('422') ||
    lower.includes('unprocessable') ||
    lower.includes('validation failed')
  ) {
    return true;
  }

  return false;
};

const isSamlSsoError = (errorMsg: string): boolean => {
  const lower = errorMsg.toLowerCase();
  return lower.includes('saml') || lower.includes('single sign-on') || lower.includes('sso');
};

const isRateLimitError = (error: unknown, errorMsg: string): boolean => {
  const status = getHttpStatus(error);
  const lower = errorMsg.toLowerCase();

  return (
    status === 429 ||
    lower.includes('rate limit') ||
    lower.includes('abuse detection') ||
    (status === 403 && lower.includes('secondary rate limit'))
  );
};

const formatUsernames = (members: GitHubOrgMember[]): string =>
  members.map((member) => `@${member.login}`).join(', ');

export const twoFactorAuthCheck: IntegrationCheck = {
  id: 'two_factor_auth',
  name: '2FA Enforcement',
  description:
    'Verify that all GitHub organization members have two-factor authentication enabled',
  service: 'code-security',
  taskMapping: TASK_TEMPLATES.twoFactorAuth,
  defaultSeverity: 'high',

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
      const orgSlug = encodeURIComponent(org.login);
      const checkedAt = new Date().toISOString();

      let membersWithout2FA: GitHubOrgMember[];
      try {
        membersWithout2FA = await ctx.fetchAllPages<GitHubOrgMember>(
          `/orgs/${orgSlug}/members?filter=2fa_disabled`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (isSamlSsoError(errorMsg)) {
          ctx.warn(`Cannot check 2FA for ${org.login}: SSO authorization is required.`);
          ctx.fail({
            title: `Cannot verify 2FA for ${org.login}`,
            description:
              'GitHub organization SSO authorization is required to access organization members.',
            resourceType: 'organization',
            resourceId: org.login,
            severity: 'medium',
            remediation:
              'Authorize this OAuth app for your organization SSO, then rerun the check.',
          });
          continue;
        }

        if (isRateLimitError(error, errorMsg)) {
          ctx.warn(`Rate limit reached while checking 2FA for ${org.login}.`);
          ctx.fail({
            title: `Rate limited while checking ${org.login}`,
            description:
              'GitHub rate limits prevented completion of this 2FA check for the organization.',
            resourceType: 'organization',
            resourceId: org.login,
            severity: 'low',
            remediation: 'Wait for the GitHub rate limit to reset, then rerun the check.',
          });
          continue;
        }

        // GitHub returns 422 when the caller is not an org owner for 2fa_* filters.
        if (isOwnerPermissionError(error, errorMsg)) {
          ctx.warn(
            `Cannot check 2FA for ${org.login}: the account must be an organization owner to use the 2FA filter.`,
          );
          ctx.fail({
            title: `Cannot verify 2FA for ${org.login}`,
            description:
              'Insufficient permissions to check 2FA status. The `filter=2fa_disabled` parameter is only available to organization owners on GitHub.',
            resourceType: 'organization',
            resourceId: org.login,
            severity: 'medium',
            remediation:
              'Reconnect the GitHub integration with an account that is an owner of this organization.',
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

      const without2FACount = membersWithout2FA.length;

      if (without2FACount === 0) {
        ctx.pass({
          title: `All members have 2FA enabled in ${org.login}`,
          description: `No members without 2FA were returned for ${org.login}.`,
          resourceType: 'organization',
          resourceId: org.login,
          evidence: {
            organization: org.login,
            membersWithout2FA: 0,
            checkedAt,
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
              checkedAt,
            },
          });
        }

        // Also emit a summary
        ctx.fail({
          title: `${without2FACount} member(s) without 2FA in ${org.login}`,
          description: `${without2FACount} member(s) in the ${org.login} organization do not have two-factor authentication enabled: ${formatUsernames(membersWithout2FA)}`,
          resourceType: 'organization',
          resourceId: `${org.login}/2fa-summary`,
          severity: 'high',
          remediation: `1. Go to https://github.com/organizations/${org.login}/settings/security\n2. Under "Authentication security", check "Require two-factor authentication for everyone"\n3. This will require all existing and future members to enable 2FA`,
          evidence: {
            organization: org.login,
            membersWithout2FA: without2FACount,
            usernames: membersWithout2FA.map((member) => member.login),
            checkedAt,
          },
        });
      }
    }
  },
};

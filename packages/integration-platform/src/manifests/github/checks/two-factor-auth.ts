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
import { parseRepoBranches, targetReposVariable } from '../variables';

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

  variables: [targetReposVariable],

  run: async (ctx) => {
    // Derive the orgs to check from the user-selected repositories.
    // We intentionally do NOT call /user/orgs — checking orgs the user happens to
    // belong to but did not select would surface findings for unrelated orgs
    // (e.g. personal side-project orgs) and confuse customers.
    const targetRepos = ctx.variables.target_repos as string[] | undefined;
    const orgsToCheck = Array.from(
      new Set(
        (targetRepos ?? [])
          .map((value) => parseRepoBranches(value).repo.split('/')[0])
          .filter((owner): owner is string => Boolean(owner)),
      ),
    );

    if (orgsToCheck.length === 0) {
      ctx.fail({
        title: 'No repositories configured',
        description:
          'No repositories are configured for 2FA enforcement checking. Please select at least one repository.',
        resourceType: 'integration',
        resourceId: 'github',
        severity: 'low',
        remediation: 'Open the integration settings and select repositories to monitor.',
      });
      return;
    }

    ctx.log(
      `Checking 2FA for ${orgsToCheck.length} organization(s) derived from selected repos: ${orgsToCheck.join(', ')}`,
    );

    // Step 2: For each org, check for members without 2FA
    for (const orgLogin of orgsToCheck) {
      ctx.log(`Checking 2FA for organization: ${orgLogin}`);
      const orgSlug = encodeURIComponent(orgLogin);
      const checkedAt = new Date().toISOString();

      let membersWithout2FA: GitHubOrgMember[];
      try {
        membersWithout2FA = await ctx.fetchAllPages<GitHubOrgMember>(
          `/orgs/${orgSlug}/members?filter=2fa_disabled`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (isSamlSsoError(errorMsg)) {
          ctx.warn(`Cannot check 2FA for ${orgLogin}: SSO authorization is required.`);
          ctx.fail({
            title: `Cannot verify 2FA for ${orgLogin}`,
            description:
              'GitHub organization SSO authorization is required to access organization members.',
            resourceType: 'organization',
            resourceId: orgLogin,
            severity: 'medium',
            remediation:
              'Authorize this OAuth app for your organization SSO, then rerun the check.',
          });
          continue;
        }

        if (isRateLimitError(error, errorMsg)) {
          ctx.warn(`Rate limit reached while checking 2FA for ${orgLogin}.`);
          ctx.fail({
            title: `Rate limited while checking ${orgLogin}`,
            description:
              'GitHub rate limits prevented completion of this 2FA check for the organization.',
            resourceType: 'organization',
            resourceId: orgLogin,
            severity: 'low',
            remediation: 'Wait for the GitHub rate limit to reset, then rerun the check.',
          });
          continue;
        }

        // The user explicitly selected a repo in this org but isn't an owner.
        // Surface as a finding so they know to either reconnect with an owner
        // account or remove the repo from the selection.
        if (isOwnerPermissionError(error, errorMsg)) {
          ctx.warn(
            `Cannot check 2FA for ${orgLogin}: the account must be an organization owner to use the 2FA filter.`,
          );
          ctx.fail({
            title: `Cannot verify 2FA for ${orgLogin}`,
            description:
              'Insufficient permissions to check 2FA status. The `filter=2fa_disabled` parameter is only available to organization owners on GitHub.',
            resourceType: 'organization',
            resourceId: orgLogin,
            severity: 'medium',
            remediation:
              'Reconnect the GitHub integration with an account that is an owner of this organization, or remove the org\'s repositories from the selection.',
          });
          continue;
        }

        ctx.error(`Failed to check 2FA for ${orgLogin}: ${errorMsg}`);
        ctx.fail({
          title: `Error checking 2FA for ${orgLogin}`,
          description: `Failed to query members without 2FA: ${errorMsg}`,
          resourceType: 'organization',
          resourceId: orgLogin,
          severity: 'medium',
          remediation: 'Check the integration connection and try again.',
        });
        continue;
      }

      const without2FACount = membersWithout2FA.length;

      if (without2FACount === 0) {
        ctx.pass({
          title: `All members have 2FA enabled in ${orgLogin}`,
          description: `No members without 2FA were returned for ${orgLogin}.`,
          resourceType: 'organization',
          resourceId: orgLogin,
          evidence: {
            organization: orgLogin,
            membersWithout2FA: 0,
            checkedAt,
          },
        });
      } else {
        // List each member without 2FA as a separate finding
        for (const member of membersWithout2FA) {
          ctx.fail({
            title: `2FA not enabled: ${member.login}`,
            description: `GitHub user @${member.login} in the ${orgLogin} organization does not have two-factor authentication enabled.`,
            resourceType: 'user',
            resourceId: `${orgLogin}/${member.login}`,
            severity: 'high',
            remediation: `Ask @${member.login} to enable 2FA in their GitHub account settings (Settings > Password and authentication > Two-factor authentication). Alternatively, enforce 2FA at the organization level in ${orgLogin}'s settings.`,
            evidence: {
              organization: orgLogin,
              username: member.login,
              userId: member.id,
              profileUrl: member.html_url,
              checkedAt,
            },
          });
        }

        // Also emit a summary
        ctx.fail({
          title: `${without2FACount} member(s) without 2FA in ${orgLogin}`,
          description: `${without2FACount} member(s) in the ${orgLogin} organization do not have two-factor authentication enabled: ${formatUsernames(membersWithout2FA)}`,
          resourceType: 'organization',
          resourceId: `${orgLogin}/2fa-summary`,
          severity: 'high',
          remediation: `1. Go to https://github.com/organizations/${orgLogin}/settings/security\n2. Under "Authentication security", check "Require two-factor authentication for everyone"\n3. This will require all existing and future members to enable 2FA`,
          evidence: {
            organization: orgLogin,
            membersWithout2FA: without2FACount,
            usernames: membersWithout2FA.map((member) => member.login),
            checkedAt,
          },
        });
      }
    }
  },
};

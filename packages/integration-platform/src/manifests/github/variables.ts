/**
 * Shared Variables for GitHub Checks
 * These can be reused across multiple checks
 */

import type { CheckVariable } from '../../types';
import type { GitHubOrg, GitHubRepo } from './types';

/**
 * Variable for selecting which repositories to monitor.
 * Dynamically fetches repositories the user has access to.
 *
 * Values are stored as `owner/repo:branch` format.
 * If branch is omitted, defaults to `main`.
 *
 * Examples:
 *   - "acme/api:main"
 *   - "acme/frontend:develop"
 *   - "acme/legacy" (defaults to main)
 */
export const targetReposVariable: CheckVariable = {
  id: 'target_repos',
  label: 'Repositories to monitor',
  type: 'multi-select',
  required: true,
  placeholder: 'Select repositories...',
  helpText: 'Select repositories and optionally specify branches (defaults to main).',
  fetchOptions: async (ctx) => {
    const allRepos = new Map<string, { value: string; label: string }>();
    let userReposError: unknown;
    let orgReposError: unknown;

    const addRepo = (repo: GitHubRepo) => {
      if (!repo?.full_name) return;
      if (allRepos.has(repo.full_name)) return;
      allRepos.set(repo.full_name, {
        value: repo.full_name,
        label: `${repo.full_name}${repo.private ? ' (private)' : ''}`,
      });
    };

    try {
      const allAccessibleRepos = await ctx.fetchAllPages<GitHubRepo>(
        '/user/repos?affiliation=owner,collaborator,organization_member&visibility=all',
      );
      const orgRepos = allAccessibleRepos.filter(
        (repo) => repo.owner?.type === 'Organization',
      );
      for (const repo of orgRepos) {
        addRepo(repo);
      }
    } catch (error) {
      userReposError = error;
    }

    if (allRepos.size === 0) {
      try {
        const orgs = await ctx.fetchAllPages<GitHubOrg>('/user/orgs');
        for (const org of orgs) {
          try {
            const repos = await ctx.fetchAllPages<GitHubRepo>(`/orgs/${org.login}/repos`);
            for (const repo of repos) {
              addRepo(repo);
            }
          } catch (error) {
            const errorStr = String(error);
            // Skip orgs with SAML SSO that haven't been authorized, or permission errors
            // This allows users to still see repos from authorized orgs
            if (
              errorStr.includes('403') ||
              errorStr.includes('SAML') ||
              errorStr.includes('Forbidden')
            ) {
              continue;
            }
            // Re-throw other errors
            throw error;
          }
        }
      } catch (error) {
        orgReposError = error;
      }
    }

    if (allRepos.size === 0) {
      if (userReposError) {
        throw userReposError;
      }
      if (orgReposError) {
        throw orgReposError;
      }
    }

    return Array.from(allRepos.values()).sort((a, b) => a.label.localeCompare(b.label));
  },
};

/**
 * Helper to parse a target_repos value into repo and branches.
 * Format: "owner/repo:branch1,branch2" or "owner/repo" (defaults to main)
 * Supports multiple comma-separated branches.
 * Handles trailing colons and edge cases.
 */
export const parseRepoBranches = (value: string): { repo: string; branches: string[] } => {
  // Remove trailing colon if present (handles "owner/repo:" edge case)
  const cleanValue = value.endsWith(':') ? value.slice(0, -1) : value;
  const colonIndex = cleanValue.lastIndexOf(':');

  if (colonIndex > 0 && colonIndex < cleanValue.length - 1) {
    const repo = cleanValue.substring(0, colonIndex);
    const branchesStr = cleanValue.substring(colonIndex + 1);
    const branches = branchesStr
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
    return { repo, branches: branches.length > 0 ? branches : ['main'] };
  }
  return { repo: cleanValue, branches: ['main'] };
};

/**
 * @deprecated Use parseRepoBranches instead for multi-branch support
 */
export const parseRepoBranch = (value: string): { repo: string; branch: string } => {
  const parsed = parseRepoBranches(value);
  return { repo: parsed.repo, branch: parsed.branches[0] || 'main' };
};

/**
 * Helper to format repo and branch into the stored format.
 */
export const formatRepoBranch = (repo: string, branch: string): string => {
  return `${repo}:${branch}`;
};

/**
 * Variable controlling how far back we look for "recent" pull requests.
 * Used by checks that validate recent code change activity.
 */
export const recentPullRequestDaysVariable: CheckVariable = {
  id: 'recent_pr_days',
  label: 'Recent PR window (days)',
  type: 'number',
  required: false,
  // ~6 months
  default: 180,
  placeholder: '180',
  helpText:
    'How many days back to look when determining whether pull requests are "recent". Confirm the right value with your security/compliance owner.',
};

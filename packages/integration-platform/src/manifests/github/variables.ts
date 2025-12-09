/**
 * Shared Variables for GitHub Checks
 * These can be reused across multiple checks
 */

import type { CheckVariable } from '../../types';
import type { GitHubOrg, GitHubRepo } from './types';

/**
 * Variable for selecting which repositories to monitor.
 * Dynamically fetches all repos from user's organizations.
 */
export const targetReposVariable: CheckVariable = {
  id: 'target_repos',
  label: 'Repositories to monitor',
  type: 'multi-select',
  required: true,
  placeholder: 'trycompai/comp',
  helpText: 'Format: {org}/{repo} - e.g., trycompai/comp, microsoft/vscode',
  fetchOptions: async (ctx) => {
    const orgs = await ctx.fetch<GitHubOrg[]>('/user/orgs');
    const allRepos: Array<{ value: string; label: string }> = [];

    for (const org of orgs) {
      const repos = await ctx.fetchAllPages<GitHubRepo>(`/orgs/${org.login}/repos`);
      for (const repo of repos) {
        allRepos.push({
          value: repo.full_name,
          label: `${repo.full_name}${repo.private ? ' (private)' : ''}`,
        });
      }
    }

    return allRepos;
  },
};

/**
 * Variable for specifying which branch to check for protection.
 */
export const protectedBranchVariable: CheckVariable = {
  id: 'protected_branch',
  label: 'Branch to check',
  type: 'text',
  required: true,
  default: 'main',
  placeholder: 'main',
  helpText: 'Branch name to check for protection - e.g., main, master, develop',
};

/**
 * Pull Request History Check
 *
 * Verifies that recent code changes are happening via pull requests by checking
 * for a minimum number of PRs targeting the configured base branch.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { GitHubOrg, GitHubPullRequest, GitHubRepo } from '../types';
import {
  protectedBranchVariable,
  recentPullRequestDaysVariable,
  targetReposVariable,
} from '../variables';

const REQUIRED_RECENT_PRS = 50;
// ~6 months
const DEFAULT_RECENT_WINDOW_DAYS = 180;
const MAX_PULLS_PAGES = 5;

interface PullRequestEvidenceSummary {
  id: number;
  number: number;
  url: string;
  state: 'open' | 'closed';
  updated_at: string;
}

const toSafeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
};

const summarizePullRequest = (pr: GitHubPullRequest): PullRequestEvidenceSummary => {
  return {
    id: pr.id,
    number: pr.number,
    url: pr.html_url,
    state: pr.state,
    updated_at: pr.updated_at,
  };
};

export const pullRequestHistoryCheck: IntegrationCheck = {
  id: 'pull_request_history',
  name: 'Pull Request History',
  description:
    'Verify that code changes are being made via pull requests by checking for recent PR activity on the configured branch.',
  taskMapping: TASK_TEMPLATES.codeChanges,
  defaultSeverity: 'medium',
  variables: [targetReposVariable, protectedBranchVariable, recentPullRequestDaysVariable],

  run: async (ctx) => {
    const targetRepos = ctx.variables.target_repos as string[] | undefined;
    const protectedBranch = ctx.variables.protected_branch as string | undefined;
    const recentDaysRaw = toSafeNumber(ctx.variables.recent_pr_days);

    const recentWindowDays =
      recentDaysRaw && recentDaysRaw > 0 ? recentDaysRaw : DEFAULT_RECENT_WINDOW_DAYS;

    if (!protectedBranch) {
      ctx.fail({
        title: 'No branch configured',
        description: 'Select a branch to check in the integration settings.',
        resourceType: 'integration',
        resourceId: 'github',
        severity: 'low',
        remediation: 'Open the GitHub integration settings and set the branch to check.',
      });
      return;
    }

    const cutoff = new Date(Date.now() - recentWindowDays * 24 * 60 * 60 * 1000);

    ctx.log(
      `PR History config: branch="${protectedBranch}", recentWindowDays=${recentWindowDays}, cutoff=${cutoff.toISOString()}`,
    );

    const fetchRecentPullRequests = async ({
      repoFullName,
      baseBranch,
    }: {
      repoFullName: string;
      baseBranch: string;
    }): Promise<PullRequestEvidenceSummary[] | null> => {
      // Fetch more than REQUIRED_RECENT_PRS so we can filter by time window and still find enough.
      // Sorting by "updated" helps keep the newest activity on the first page.
      const base = encodeURIComponent(baseBranch);
      try {
        ctx.log(
          `[PR History] Fetching PRs for ${repoFullName} with base="${baseBranch}" (state=all)`,
        );
        const pulls = await ctx.fetchAllPages<GitHubPullRequest>(
          `/repos/${repoFullName}/pulls?state=all&base=${base}&sort=updated&direction=desc`,
          { maxPages: MAX_PULLS_PAGES },
        );

        const recent = pulls.filter((pr) => {
          const createdAt = new Date(pr.created_at);
          return createdAt.getTime() >= cutoff.getTime();
        });

        return recent.slice(0, REQUIRED_RECENT_PRS).map(summarizePullRequest);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.warn(`[PR History] Could not fetch pull requests for ${repoFullName}: ${errorMsg}`);
        return null;
      }
    };

    ctx.log('Fetching repositories...');

    let repos: GitHubRepo[];
    if (targetRepos && targetRepos.length > 0) {
      repos = [];
      for (const repoName of targetRepos) {
        try {
          const repo = await ctx.fetch<GitHubRepo>(`/repos/${repoName}`);
          repos.push(repo);
        } catch {
          ctx.warn(`Could not fetch repo ${repoName}`);
        }
      }
    } else {
      const orgs = await ctx.fetch<GitHubOrg[]>('/user/orgs');
      repos = [];
      for (const org of orgs) {
        const orgRepos = await ctx.fetchAllPages<GitHubRepo>(`/orgs/${org.login}/repos`);
        repos.push(...orgRepos);
      }
    }

    ctx.log(
      `Checking ${repos.length} repositories for recent pull request activity on "${protectedBranch}"`,
    );

    for (const repo of repos) {
      const recentPullRequests = await fetchRecentPullRequests({
        repoFullName: repo.full_name,
        baseBranch: protectedBranch,
      });

      if (!recentPullRequests) {
        ctx.fail({
          title: `Could not fetch pull requests for ${repo.name}`,
          description:
            'We were unable to retrieve pull request history for this repository. This can happen due to missing permissions or API rate limits.',
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'low',
          remediation:
            'Ensure the GitHub OAuth token has access to this repository (and read access to pull requests), then re-run the check.',
          evidence: {
            repository: repo.full_name,
            base_branch: protectedBranch,
            recent_window_days: recentWindowDays,
            checked_at: new Date().toISOString(),
          },
        });
        continue;
      }

      if (recentPullRequests.length >= REQUIRED_RECENT_PRS) {
        ctx.pass({
          title: `Recent PR activity on ${repo.name}`,
          description: `Found at least ${REQUIRED_RECENT_PRS} pull request(s) created in the last ${recentWindowDays} day(s) targeting "${protectedBranch}".`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            repository: repo.full_name,
            base_branch: protectedBranch,
            recent_window_days: recentWindowDays,
            cutoff_iso: cutoff.toISOString(),
            required_recent_prs: REQUIRED_RECENT_PRS,
            recent_pull_requests: recentPullRequests,
            checked_at: new Date().toISOString(),
          },
        });
      } else {
        ctx.fail({
          title: `Insufficient recent PRs on ${repo.name}`,
          description: `Found ${recentPullRequests.length} pull request(s) created in the last ${recentWindowDays} day(s) targeting "${protectedBranch}". This check requires at least ${REQUIRED_RECENT_PRS}.`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation:
            `Use a pull request based workflow for changes targeting "${protectedBranch}" and ensure there is recent PR activity in this repository.`,
          evidence: {
            repository: repo.full_name,
            base_branch: protectedBranch,
            recent_window_days: recentWindowDays,
            cutoff_iso: cutoff.toISOString(),
            required_recent_prs: REQUIRED_RECENT_PRS,
            recent_pull_requests: recentPullRequests,
            checked_at: new Date().toISOString(),
          },
        });
      }
    }
  },
};



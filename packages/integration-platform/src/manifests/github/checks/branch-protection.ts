/**
 * Branch Protection Check
 * Verifies that default branches have protection rules configured.
 * Also fetches recent pull request history for the protected branch
 * and includes it in the evidence for auditors.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type {
  GitHubBranchProtection,
  GitHubBranchRule,
  GitHubPullRequest,
  GitHubRepo,
  GitHubRuleset,
} from '../types';
import {
  parseRepoBranches,
  recentPullRequestDaysVariable,
  targetReposVariable,
} from '../variables';

// ─────────────────────────────────────────────────────────────────────────────
// PR History Config
// ─────────────────────────────────────────────────────────────────────────────
const MAX_RECENT_PRS = 50;
const DEFAULT_RECENT_WINDOW_DAYS = 180; // ~6 months

interface PullRequestEvidenceSummary {
  id: number;
  number: number;
  url: string;
  state: 'open' | 'closed';
  title: string;
  author: string | null;
  created_at: string;
  updated_at: string;
}

const summarizePullRequest = (pr: GitHubPullRequest): PullRequestEvidenceSummary => ({
  id: pr.id,
  number: pr.number,
  url: pr.html_url,
  state: pr.state,
  title: pr.title,
  author: pr.user?.login ?? null,
  created_at: pr.created_at,
  updated_at: pr.updated_at,
});

const toSafeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
};

export const branchProtectionCheck: IntegrationCheck = {
  id: 'branch_protection',
  name: 'Branch Protection Enabled',
  description: 'Verify that default branches have protection rules configured',
  taskMapping: TASK_TEMPLATES.codeChanges,
  defaultSeverity: 'high',

  variables: [targetReposVariable, recentPullRequestDaysVariable],

  run: async (ctx) => {
    const targetRepos = ctx.variables.target_repos as string[] | undefined;
    const recentDaysRaw = toSafeNumber(ctx.variables.recent_pr_days);
    const recentWindowDays =
      recentDaysRaw && recentDaysRaw > 0 ? recentDaysRaw : DEFAULT_RECENT_WINDOW_DAYS;
    const cutoff = new Date(Date.now() - recentWindowDays * 24 * 60 * 60 * 1000);

    // Parse repo:branches from each selected value, then flatten to individual repo+branch pairs
    const parsedConfigs = (targetRepos || []).map(parseRepoBranches);
    const repoBranchConfigs: { repo: string; branch: string }[] = [];
    for (const config of parsedConfigs) {
      for (const branch of config.branches) {
        repoBranchConfigs.push({ repo: config.repo, branch });
      }
    }

    ctx.log(
      `Config: ${repoBranchConfigs.length} repo/branch pairs from ${parsedConfigs.length} repos, recentWindowDays=${recentWindowDays}, cutoff=${cutoff.toISOString()}`,
    );

    // ───────────────────────────────────────────────────────────────────────
    // Validate configuration
    // ───────────────────────────────────────────────────────────────────────
    if (repoBranchConfigs.length === 0) {
      ctx.fail({
        title: 'No repositories configured',
        description:
          'No repositories are configured for branch protection checking. Please select at least one repository.',
        resourceType: 'integration',
        resourceId: 'github',
        severity: 'low',
        remediation: 'Open the integration settings and select repositories to monitor.',
      });
      return;
    }

    // ───────────────────────────────────────────────────────────────────────
    // Helper: fetch recent PRs targeting the protected branch
    // ───────────────────────────────────────────────────────────────────────
    const fetchRecentPullRequests = async ({
      repoFullName,
      baseBranch,
    }: {
      repoFullName: string;
      baseBranch: string;
    }): Promise<PullRequestEvidenceSummary[] | null> => {
      const base = encodeURIComponent(baseBranch);
      try {
        ctx.log(`[PRs] Fetching PRs for ${repoFullName} with base="${baseBranch}"`);
        const pulls = await ctx.fetchAllPages<GitHubPullRequest>(
          `/repos/${repoFullName}/pulls?state=all&base=${base}&sort=updated&direction=desc`,
          { maxPages: 5 },
        );
        const recent = pulls.filter((pr) => new Date(pr.created_at).getTime() >= cutoff.getTime());
        return recent.slice(0, MAX_RECENT_PRS).map(summarizePullRequest);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.warn(`[PRs] Could not fetch pull requests for ${repoFullName}: ${errorMsg}`);
        return null;
      }
    };

    ctx.log(`Checking ${repoBranchConfigs.length} repository/branch configurations...`);

    // Group configs by repo for combined evidence
    const repoGroups = new Map<string, string[]>();
    for (const config of repoBranchConfigs) {
      const branches = repoGroups.get(config.repo) || [];
      branches.push(config.branch);
      repoGroups.set(config.repo, branches);
    }

    // ───────────────────────────────────────────────────────────────────────
    // Check each repository (with all its branches)
    // ───────────────────────────────────────────────────────────────────────
    for (const [repoName, branchesToCheck] of repoGroups) {
      // Fetch repository info
      let repo: GitHubRepo;
      try {
        repo = await ctx.fetch<GitHubRepo>(`/repos/${repoName}`);
      } catch {
        ctx.warn(`Could not fetch repo ${repoName}`);
        ctx.fail({
          title: `Repository not found: ${repoName}`,
          description: `Could not access repository "${repoName}". It may not exist or the integration lacks permission.`,
          resourceType: 'repository',
          resourceId: repoName,
          severity: 'medium',
          remediation: `Verify the repository name is correct (format: owner/repo) and that the GitHub integration has access to it.`,
        });
        continue;
      }

      ctx.log(`Checking ${branchesToCheck.length} branches on ${repo.full_name}: ${branchesToCheck.join(', ')}`);

      // Collect results for all branches in this repo
      const branchResults: Record<
        string,
        {
          protected: boolean;
          evidence: Record<string, unknown>;
          description: string;
        }
      > = {};

      // Check each branch
      for (const branchToCheck of branchesToCheck) {
        ctx.log(`Checking branch "${branchToCheck}" on ${repo.full_name}`);

      // Fetch recent PRs in parallel while we check protection
      const pullRequestsPromise = fetchRecentPullRequests({
        repoFullName: repo.full_name,
        baseBranch: branchToCheck,
      });

      // Helper to check if a branch matches ruleset conditions
      const branchMatchesRuleset = (ruleset: GitHubRuleset, branch: string): boolean => {
        if (!ruleset.conditions?.ref_name) return true;
        const includes = ruleset.conditions.ref_name.include || [];
        const excludes = ruleset.conditions.ref_name.exclude || [];

        for (const pattern of excludes) {
          if (pattern === `refs/heads/${branch}` || pattern === `~DEFAULT_BRANCH`) {
            return false;
          }
        }

        if (includes.length === 0) return true;
        for (const pattern of includes) {
          if (
            pattern === `refs/heads/${branch}` ||
            pattern === '~ALL' ||
            (pattern === '~DEFAULT_BRANCH' && branch === repo.default_branch)
          ) {
            return true;
          }
        }
        return false;
      };

      let isProtected = false;
      let protectionEvidence: Record<string, unknown> = {};
      let protectionDescription = '';

      // Strategy 1: Try the unified rules endpoint
      ctx.log(`[Strategy 1] Trying /repos/${repo.full_name}/rules/branches/${branchToCheck}`);
      try {
        const rules = await ctx.fetch<GitHubBranchRule[]>(
          `/repos/${repo.full_name}/rules/branches/${branchToCheck}`,
        );

        ctx.log(
          `[Strategy 1] Got ${rules.length} rules: ${JSON.stringify(rules.map((r) => r.type))}`,
        );

        const hasPullRequestRule = rules.some((r) => r.type === 'pull_request');
        const hasNonFastForward = rules.some((r) => r.type === 'non_fast_forward');

        if (rules.length > 0 && (hasPullRequestRule || hasNonFastForward)) {
          isProtected = true;
          const protectionTypes: string[] = [];
          if (hasPullRequestRule) protectionTypes.push('pull request reviews');
          if (hasNonFastForward) protectionTypes.push('non-fast-forward');

          const rulesetSources = [
            ...new Set(rules.filter((r) => r.ruleset_source).map((r) => r.ruleset_source)),
          ];

          protectionDescription = `Branch "${branchToCheck}" is protected with: ${protectionTypes.join(', ')}. ${rulesetSources.length > 0 ? `Source: ${rulesetSources.join(', ')}` : ''}`;
          protectionEvidence = {
            source: 'rules_endpoint',
            branch: branchToCheck,
            rules,
            rule_types: rules.map((r) => r.type),
            ruleset_sources: rulesetSources,
          };
          ctx.log(`[Strategy 1] SUCCESS - Found protection via rules endpoint`);
        } else {
          ctx.log(`[Strategy 1] No PR or non-fast-forward rules found`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.warn(`[Strategy 1] FAILED: ${errorMsg}`);
      }

      // Strategy 2: Check rulesets directly
      if (!isProtected) {
        ctx.log(`[Strategy 2] Trying /repos/${repo.full_name}/rulesets`);
        try {
          const rulesets = await ctx.fetch<GitHubRuleset[]>(`/repos/${repo.full_name}/rulesets`);

          ctx.log(`[Strategy 2] Got ${rulesets.length} rulesets`);

          const applicableRulesets = rulesets.filter(
            (rs) =>
              rs.enforcement === 'active' &&
              rs.target === 'branch' &&
              branchMatchesRuleset(rs, branchToCheck),
          );

          ctx.log(
            `[Strategy 2] ${applicableRulesets.length} active rulesets apply to "${branchToCheck}"`,
          );

          for (const rs of applicableRulesets) {
            ctx.log(
              `[Strategy 2] Ruleset "${rs.name}": rules=${JSON.stringify(rs.rules?.map((r) => r.type))}`,
            );
          }

          for (const ruleset of applicableRulesets) {
            const hasPullRequest = ruleset.rules?.some((r) => r.type === 'pull_request');
            if (hasPullRequest) {
              isProtected = true;
              const pullRequestRule = ruleset.rules?.find((r) => r.type === 'pull_request');
              protectionDescription = `Branch "${branchToCheck}" is protected by ruleset "${ruleset.name}" requiring pull request reviews.`;
              protectionEvidence = {
                source: 'rulesets_endpoint',
                branch: branchToCheck,
                ruleset_name: ruleset.name,
                ruleset_id: ruleset.id,
                enforcement: ruleset.enforcement,
                rules: ruleset.rules,
                pull_request_params: pullRequestRule?.parameters,
              };
              break;
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          ctx.warn(`[Strategy 2] FAILED: ${errorMsg}`);
        }
      }

      // Strategy 3: Try legacy branch protection endpoint
      if (!isProtected) {
        ctx.log(
          `[Strategy 3] Trying /repos/${repo.full_name}/branches/${branchToCheck}/protection`,
        );
        try {
          const protection = await ctx.fetch<GitHubBranchProtection>(
            `/repos/${repo.full_name}/branches/${branchToCheck}/protection`,
          );

          isProtected = true;
          protectionDescription = `Branch "${branchToCheck}" requires ${protection.required_pull_request_reviews?.required_approving_review_count || 0} approving review(s) (legacy protection).`;
          protectionEvidence = {
            source: 'legacy_branch_protection',
            branch: branchToCheck,
            protection_rules: protection,
          };
          ctx.log(`[Strategy 3] SUCCESS - Found legacy branch protection`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          ctx.warn(`[Strategy 3] FAILED: ${errorMsg}`);
        }
      }

        // Wait for PR fetch to complete
        const pullRequests = await pullRequestsPromise;

        // Build evidence for this branch
        const branchEvidence: Record<string, unknown> = {
          protected: isProtected,
          ...protectionEvidence,
          pull_requests: pullRequests,
          pull_requests_window_days: recentWindowDays,
          checked_at: new Date().toISOString(),
        };

        branchResults[branchToCheck] = {
          protected: isProtected,
          evidence: branchEvidence,
          description: isProtected
            ? protectionDescription
            : `Branch "${branchToCheck}" has no protection rules configured.`,
        };
      } // End of branch loop

      // Emit combined result for this repo
      const protectedBranches = Object.entries(branchResults)
        .filter(([, r]) => r.protected)
        .map(([b]) => b);
      const unprotectedBranches = Object.entries(branchResults)
        .filter(([, r]) => !r.protected)
        .map(([b]) => b);

      // Build combined evidence: { "owner/repo": { "branch1": {...}, "branch2": {...} } }
      const combinedEvidence: Record<string, Record<string, unknown>> = {};
      for (const [branch, result] of Object.entries(branchResults)) {
        combinedEvidence[branch] = result.evidence;
      }

      if (unprotectedBranches.length === 0) {
        // All branches protected
        ctx.pass({
          title: `All branches protected on ${repo.name}`,
          description: `${protectedBranches.length} branch(es) have protection enabled: ${protectedBranches.join(', ')}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            [repo.full_name]: combinedEvidence,
          },
        });
      } else if (protectedBranches.length === 0) {
        // No branches protected
        ctx.fail({
          title: `No branch protection on ${repo.name}`,
          description: `${unprotectedBranches.length} branch(es) have no protection: ${unprotectedBranches.join(', ')}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'high',
          remediation: `1. Go to ${repo.html_url}/settings/rules\n2. Create rulesets for branches: ${unprotectedBranches.join(', ')}\n3. Enable "Require a pull request before merging"\n4. Set required approvals to at least 1`,
          evidence: {
            [repo.full_name]: combinedEvidence,
          },
        });
      } else {
        // Mixed: some protected, some not
        ctx.fail({
          title: `Partial branch protection on ${repo.name}`,
          description: `Protected: ${protectedBranches.join(', ')}. Unprotected: ${unprotectedBranches.join(', ')}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'high',
          remediation: `1. Go to ${repo.html_url}/settings/rules\n2. Create rulesets for unprotected branches: ${unprotectedBranches.join(', ')}\n3. Enable "Require a pull request before merging"`,
          evidence: {
            [repo.full_name]: combinedEvidence,
          },
        });
      }
    }
  },
};

/**
 * Branch Protection Check
 * Verifies that default branches have protection rules configured
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type {
  GitHubBranchProtection,
  GitHubBranchRule,
  GitHubOrg,
  GitHubRepo,
  GitHubRuleset,
} from '../types';
import { protectedBranchVariable, targetReposVariable } from '../variables';

export const branchProtectionCheck: IntegrationCheck = {
  id: 'branch_protection',
  name: 'Branch Protection Enabled',
  description: 'Verify that default branches have protection rules configured',
  taskMapping: TASK_TEMPLATES.codeChanges,
  defaultSeverity: 'high',

  variables: [targetReposVariable, protectedBranchVariable],

  run: async (ctx) => {
    const targetRepos = ctx.variables.target_repos as string[] | undefined;
    const protectedBranch = ctx.variables.protected_branch as string | undefined;

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

    ctx.log(`Checking ${repos.length} repositories`);

    for (const repo of repos) {
      const branchToCheck = protectedBranch || repo.default_branch;
      if (!branchToCheck) continue;

      ctx.log(`Checking branch "${branchToCheck}" on ${repo.full_name}`);

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

      // Record result
      if (isProtected) {
        ctx.pass({
          title: `Branch protection enabled on ${repo.name}`,
          description: protectionDescription,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            ...protectionEvidence,
            checked_at: new Date().toISOString(),
          },
        });
      } else {
        ctx.fail({
          title: `No branch protection on ${repo.name}`,
          description: `Branch "${branchToCheck}" has no protection rules configured, allowing direct pushes without review.`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'high',
          remediation: `1. Go to ${repo.html_url}/settings/rules\n2. Create a new ruleset targeting branch "${branchToCheck}"\n3. Enable "Require a pull request before merging"\n4. Set required approvals to at least 1`,
        });
      }
    }
  },
};

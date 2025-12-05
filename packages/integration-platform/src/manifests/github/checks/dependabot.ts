/**
 * Dependabot Check
 * Verifies that Dependabot security updates are enabled on repositories
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { GitHubOrg, GitHubRepo } from '../types';
import { targetReposVariable } from '../variables';

export const dependabotCheck: IntegrationCheck = {
  id: 'dependabot_enabled',
  name: 'Dependabot Security Updates Enabled',
  description: 'Verify that Dependabot security updates are enabled on repositories',
  taskMapping: TASK_TEMPLATES.secureCode,
  defaultSeverity: 'medium',

  variables: [targetReposVariable],

  run: async (ctx) => {
    const targetRepos = ctx.variables.target_repos as string[] | undefined;

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

    ctx.log(`Checking ${repos.length} repositories for Dependabot`);

    for (const repo of repos) {
      const dependabotStatus = repo.security_and_analysis?.dependabot_security_updates?.status;

      if (dependabotStatus === 'enabled') {
        ctx.pass({
          title: `Dependabot enabled on ${repo.name}`,
          description:
            'Dependabot security updates are enabled and will automatically create pull requests to fix vulnerable dependencies.',
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            security_and_analysis: repo.security_and_analysis,
            checked_at: new Date().toISOString(),
          },
        });
      } else {
        ctx.fail({
          title: `Dependabot not enabled on ${repo.name}`,
          description:
            'Dependabot security updates are not enabled, leaving the repository vulnerable to known dependency exploits.',
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation: `1. Go to ${repo.html_url}/settings/security_analysis\n2. Enable "Dependabot security updates"\n3. Optionally enable "Dependabot version updates" for proactive updates`,
        });
      }
    }
  },
};

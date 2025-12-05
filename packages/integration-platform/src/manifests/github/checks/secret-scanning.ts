/**
 * Secret Scanning Check
 * Verifies that secret scanning is enabled on repositories
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { GitHubOrg, GitHubRepo } from '../types';
import { targetReposVariable } from '../variables';

export const secretScanningCheck: IntegrationCheck = {
  id: 'secret_scanning',
  name: 'Secret Scanning Enabled',
  description: 'Verify that secret scanning is enabled on repositories',
  taskMapping: TASK_TEMPLATES.secureSecrets,
  defaultSeverity: 'high',

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

    ctx.log(`Checking ${repos.length} repositories for secret scanning`);

    for (const repo of repos) {
      const secretScanning = repo.security_and_analysis?.secret_scanning?.status;
      const pushProtection = repo.security_and_analysis?.secret_scanning_push_protection?.status;

      if (secretScanning === 'enabled') {
        ctx.pass({
          title: `Secret scanning enabled on ${repo.name}`,
          description: `Secret scanning is active${pushProtection === 'enabled' ? ' with push protection enabled, blocking commits containing secrets' : ''}. This helps prevent accidental exposure of API keys, tokens, and other secrets in code.`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            secret_scanning: secretScanning,
            push_protection: pushProtection,
            checked_at: new Date().toISOString(),
          },
        });
      } else {
        ctx.fail({
          title: `Secret scanning not enabled on ${repo.name}`,
          description:
            'Secret scanning is not enabled, which means leaked secrets in code may go undetected.',
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'high',
          remediation: `1. Go to ${repo.html_url}/settings/security_analysis\n2. Enable "Secret scanning"\n3. Also enable "Push protection" to block commits containing secrets`,
        });
      }
    }
  },
};

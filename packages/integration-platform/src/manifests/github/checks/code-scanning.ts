/**
 * Code Scanning Check
 *
 * Verifies repositories have automated static analysis configured. Detects:
 * - GitHub CodeQL default setup
 * - Custom CodeQL workflow files (.github/workflows/*.yml with codeql-action)
 * - Third-party SARIF uploaders (Semgrep, Snyk, Trivy, etc.)
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { GitHubRepo, GitHubTreeEntry, GitHubTreeResponse } from '../types';
import { parseRepoBranch, targetReposVariable } from '../variables';
import { getCodeScanningStatus } from './code-scanning-detector';

export const codeScanningCheck: IntegrationCheck = {
  id: 'code_scanning',
  name: 'Code Scanning',
  description:
    'Verifies repositories have GitHub CodeQL or an equivalent static analysis tool configured. Detects default-setup CodeQL, custom CodeQL workflows, and third-party SARIF uploaders.',
  service: 'code-security',
  taskMapping: TASK_TEMPLATES.sanitizedInputs,
  defaultSeverity: 'medium',
  variables: [targetReposVariable],

  run: async (ctx) => {
    const targetReposRaw = (ctx.variables.target_repos as string[] | undefined) ?? [];
    const targetRepos = targetReposRaw.map((v) => parseRepoBranch(v).repo);

    if (targetRepos.length === 0) {
      ctx.fail({
        title: 'No repositories selected',
        description:
          'Select at least one repository to monitor in the integration settings so we can verify code scanning.',
        resourceType: 'integration',
        resourceId: 'github',
        severity: 'low',
        remediation: 'Open the integration settings and choose repositories to monitor.',
      });
      return;
    }

    const fetchRepo = async (fullName: string): Promise<GitHubRepo | null> => {
      try {
        return await ctx.fetch<GitHubRepo>(`/repos/${fullName}`);
      } catch (error) {
        ctx.warn(`Failed to fetch repo ${fullName}: ${String(error)}`);
        return null;
      }
    };

    const fetchRepoTree = async (repoName: string, branch: string): Promise<GitHubTreeEntry[]> => {
      try {
        const tree = await ctx.fetch<GitHubTreeResponse>(
          `/repos/${repoName}/git/trees/${branch}?recursive=1`,
        );
        if (tree.truncated) {
          ctx.warn(`Repository ${repoName} has too many files, tree was truncated`);
        }
        return tree.tree;
      } catch (error) {
        ctx.warn(`Failed to fetch tree for ${repoName}: ${String(error)}`);
        return [];
      }
    };

    for (const repoName of targetRepos) {
      const repo = await fetchRepo(repoName);
      if (!repo) continue;

      const tree = await fetchRepoTree(repo.full_name, repo.default_branch);
      const isGhasEnabled = repo.security_and_analysis?.advanced_security?.status === 'enabled';

      const codeScanningStatus = await getCodeScanningStatus({
        ctx,
        repoName: repo.full_name,
        tree,
        isPrivate: repo.private,
        isGhasEnabled,
      });

      switch (codeScanningStatus.status) {
        case 'enabled': {
          const methodDescription =
            codeScanningStatus.method === 'default-setup'
              ? 'GitHub CodeQL default setup is enabled.'
              : `Code scanning configured via workflow: ${codeScanningStatus.workflow}`;

          ctx.pass({
            title: `CodeQL scanning configured for ${repo.name}`,
            description: methodDescription,
            resourceType: 'repository',
            resourceId: repo.full_name,
            evidence: {
              [repo.full_name]: {
                code_scanning: {
                  status: 'enabled',
                  method: codeScanningStatus.method,
                  ...(codeScanningStatus.languages && { languages: codeScanningStatus.languages }),
                  ...(codeScanningStatus.workflow && { workflow: codeScanningStatus.workflow }),
                  checked_at: new Date().toISOString(),
                },
              },
            },
          });
          break;
        }

        case 'ghas-required':
          ctx.fail({
            title: `Code scanning requires GitHub Advanced Security for ${repo.name}`,
            description:
              'This is a private repository. GitHub Advanced Security (GHAS) must be enabled before CodeQL can be configured. GHAS is a paid feature for private repositories.',
            resourceType: 'repository',
            resourceId: repo.full_name,
            severity: 'medium',
            remediation:
              'Enable GitHub Advanced Security in the repository settings (Settings → Code security and analysis → GitHub Advanced Security), then enable CodeQL.',
            evidence: {
              [repo.full_name]: {
                code_scanning: {
                  status: 'ghas_required',
                  checked_at: new Date().toISOString(),
                },
              },
            },
          });
          break;

        case 'permission-denied':
          ctx.fail({
            title: `Cannot access code scanning configuration for ${repo.name}`,
            description:
              'The GitHub integration does not have permission to read code scanning configuration. This may be due to missing permissions or organization policies.',
            resourceType: 'repository',
            resourceId: repo.full_name,
            severity: 'medium',
            remediation:
              'Ensure the GitHub App has "Code scanning alerts: Read" permission. If this is an organization repository, check that organization policies allow access.',
            evidence: {
              [repo.full_name]: {
                code_scanning: {
                  status: 'permission_denied',
                  checked_at: new Date().toISOString(),
                },
              },
            },
          });
          break;

        case 'not-configured':
        default:
          ctx.fail({
            title: `Code scanning not enabled for ${repo.name}`,
            description:
              'GitHub CodeQL (or an equivalent static analysis tool) is not configured. Enable it to automatically detect insecure patterns.',
            resourceType: 'repository',
            resourceId: repo.full_name,
            severity: 'medium',
            remediation:
              'In the repository Security tab, enable CodeQL default setup (or add a custom workflow) to run on every push.',
            evidence: {
              [repo.full_name]: {
                code_scanning: {
                  status: 'not_configured',
                  checked_at: new Date().toISOString(),
                },
              },
            },
          });
          break;
      }
    }
  },
};

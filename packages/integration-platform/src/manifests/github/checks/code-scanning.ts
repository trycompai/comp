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
import type {
  GitHubCodeScanningDefaultSetup,
  GitHubRepo,
  GitHubTreeEntry,
  GitHubTreeResponse,
} from '../types';
import { parseRepoBranch, targetReposVariable } from '../variables';
import { FILE_READ_CONCURRENCY, mapWithConcurrency } from './concurrency';

// Patterns that indicate code scanning is configured in a workflow
const CODE_SCANNING_PATTERNS = [
  'github/codeql-action/init',
  'github/codeql-action/analyze',
  'github/codeql-action/upload-sarif',
  'codeql-action/init',
  'codeql-action/analyze',
  'codeql-action/upload-sarif',
  'upload-sarif', // Generic SARIF upload
];

interface GitHubFileResponse {
  content: string;
  encoding: 'base64' | 'utf-8';
  path: string;
}

type CodeScanningStatus =
  | {
      status: 'enabled';
      method: 'default-setup' | 'workflow';
      languages?: string[];
      workflow?: string;
    }
  | { status: 'not-configured' }
  | { status: 'permission-denied'; isPrivate: boolean }
  | { status: 'ghas-required' };

/**
 * Whether the repo's code-scanning entitlement (GitHub Code Security, formerly
 * Advanced Security) is enabled. `unknown` covers the case where GitHub omits the
 * repo's `security_and_analysis` block because the token lacks repo-admin
 * visibility (common over OAuth connections) — we must NOT treat that as
 * `disabled`.
 */
type GhasStatus = 'enabled' | 'disabled' | 'unknown';

const decodeFile = (file: GitHubFileResponse): string => {
  if (!file?.content) return '';
  if (file.encoding === 'base64') {
    return Buffer.from(file.content, 'base64').toString('utf-8');
  }
  return file.content;
};

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

    const fetchFile = async (repoName: string, path: string): Promise<string | null> => {
      try {
        const file = await ctx.fetch<GitHubFileResponse>(`/repos/${repoName}/contents/${path}`);
        return decodeFile(file);
      } catch {
        return null;
      }
    };

    const hasCodeScanningInWorkflow = (content: string): boolean => {
      const lower = content.toLowerCase();
      return CODE_SCANNING_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
    };

    const findCodeScanningWorkflows = async (
      repoName: string,
      tree: GitHubTreeEntry[],
    ): Promise<string[]> => {
      const workflowFiles = tree.filter(
        (entry) =>
          entry.type === 'blob' &&
          entry.path.startsWith('.github/workflows/') &&
          (entry.path.endsWith('.yml') || entry.path.endsWith('.yaml')),
      );

      // Read each workflow file with bounded concurrency. Serially, a
      // workflow-heavy repo (or one under GitHub's secondary rate limit)
      // exceeded the synchronous manual-run HTTP timeout. See concurrency.ts.
      const scanned = await mapWithConcurrency(
        workflowFiles,
        FILE_READ_CONCURRENCY,
        async (entry) => {
          const content = await fetchFile(repoName, entry.path);
          return content && hasCodeScanningInWorkflow(content) ? entry.path : null;
        },
      );

      return scanned.filter((path): path is string => path !== null);
    };

    const getCodeScanningStatus = async ({
      repoName,
      tree,
      isPrivate,
      ghasStatus,
    }: {
      repoName: string;
      tree: GitHubTreeEntry[];
      isPrivate: boolean;
      ghasStatus: GhasStatus;
    }): Promise<CodeScanningStatus> => {
      let apiGot403 = false;
      // GitHub returns 403 for two very different reasons, and only one is our
      // fault. When the code-scanning feature is simply not turned on for the
      // repo, the 403 body says "…must be enabled…" (Code Security / Advanced
      // Security). When our token genuinely lacks access it says "Resource not
      // accessible by integration". This flag records the former so we don't
      // report a repo-configuration gap as a missing integration permission.
      let featureDisabled = false;

      // First, try the default setup API
      try {
        const setup = await ctx.fetch<GitHubCodeScanningDefaultSetup>(
          `/repos/${repoName}/code-scanning/default-setup`,
        );
        if (setup.state === 'configured') {
          return {
            status: 'enabled',
            method: 'default-setup',
            languages: setup.languages || [],
          };
        }
      } catch (error) {
        const errorStr = String(error);

        if (errorStr.includes('403') || errorStr.includes('Forbidden')) {
          // The code-scanning API requires Code Security for private repos, but
          // reading workflow file contents only requires contents:read. A 403
          // here does not mean we can't check for code scanning workflows.
          //
          // `ctx.fetch` puts GitHub's response body in the error message, so we
          // can read GitHub's own explanation. "…must be enabled…" means the
          // feature is off on the repo, not that we lack permission.
          if (/must be enabled|advanced security|code security/i.test(errorStr)) {
            featureDisabled = true;
          }
          ctx.log(
            `Code scanning API returned 403 for ${repoName} (private: ${isPrivate}, ghas: ${ghasStatus}, featureDisabled: ${featureDisabled}). Falling back to workflow file scanning.`,
          );
          apiGot403 = true;
        } else {
          // Other errors - API might not be available, continue to check workflows
          ctx.log(`Code scanning default setup not available for ${repoName}: ${errorStr}`);
        }
      }

      // Fall back to checking for workflow files with code scanning.
      // This catches repos using third-party SAST tools (Semgrep, Snyk, Trivy, etc.)
      // that upload SARIF results via github/codeql-action/upload-sarif.
      const codeScanningWorkflows = await findCodeScanningWorkflows(repoName, tree);
      if (codeScanningWorkflows.length > 0) {
        return {
          status: 'enabled',
          method: 'workflow',
          workflow: codeScanningWorkflows[0],
        };
      }

      if (apiGot403) {
        // Prefer GitHub's own explanation. If it told us the feature must be
        // enabled, this is a repo-configuration gap, not a permission problem:
        // a private repo needs GitHub Code Security (paid), while a public repo
        // just has not set code scanning up.
        if (featureDisabled) {
          return isPrivate ? { status: 'ghas-required' } : { status: 'not-configured' };
        }
        // No feature-off signal in the body. Fall back to the repo's
        // `security_and_analysis` block: only claim "Code Security required" when
        // we can positively confirm it is disabled. Over a connection without
        // repo-admin visibility GitHub omits that block, so ghasStatus is
        // 'unknown' — treat that (and 'enabled') as permission-denied rather than
        // falsely reporting the feature is off.
        if (isPrivate && ghasStatus === 'disabled') {
          return { status: 'ghas-required' };
        }
        return { status: 'permission-denied', isPrivate };
      }

      return { status: 'not-configured' };
    };

    for (const repoName of targetRepos) {
      const repo = await fetchRepo(repoName);
      if (!repo) continue;

      const tree = await fetchRepoTree(repo.full_name, repo.default_branch);
      // Read the code-scanning entitlement. GitHub's 2026 Code Security GA renamed
      // this from `advanced_security` to `code_security`; check the new key first
      // and fall back to the old one for GitHub Enterprise Server / older payloads.
      // `security_and_analysis` is only returned to repo admins, so over a
      // connection without admin visibility the whole block is undefined —
      // 'unknown', NOT 'disabled'. Conflating the two is what made us falsely
      // report the feature off (or, after the OAuth fix, falsely report a
      // permission problem).
      const sa = repo.security_and_analysis;
      const ghasStatus: GhasStatus =
        sa?.code_security?.status ?? sa?.advanced_security?.status ?? 'unknown';

      const codeScanningStatus = await getCodeScanningStatus({
        repoName: repo.full_name,
        tree,
        isPrivate: repo.private,
        ghasStatus,
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
            title: `Code scanning requires GitHub Code Security for ${repo.name}`,
            description:
              'This private repository has no code scanning configured. GitHub CodeQL requires GitHub Code Security (formerly GitHub Advanced Security), a paid feature for private repositories. A third-party SAST tool (Semgrep, Snyk, Trivy, etc.) that uploads SARIF results also satisfies this check.',
            resourceType: 'repository',
            resourceId: repo.full_name,
            severity: 'medium',
            remediation:
              'Enable GitHub Code Security for this repository (Settings → Code security → GitHub Advanced Security / Code Security) and turn on CodeQL default setup, or add a workflow under .github/workflows that runs a SAST tool and uploads SARIF (github/codeql-action/upload-sarif).',
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
              "GitHub returned 403 when reading this repository's code scanning configuration. GitHub requires admin (Administration: read) access to the repository to read this setting, and the connected account or GitHub App installation does not currently have it for this repo.",
            resourceType: 'repository',
            resourceId: repo.full_name,
            severity: 'medium',
            remediation:
              'Reconnect with an account that has admin access to this repository, or grant the GitHub App installation admin (Administration: read) access to it. If this is an organization repository, also confirm organization policies allow the app to access it.',
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

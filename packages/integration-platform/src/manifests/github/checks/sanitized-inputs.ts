/**
 * Sanitized Inputs Check
 *
 * Ensures repositories use a modern validation/sanitization library and have
 * automated static analysis (CodeQL) enabled. Supports monorepos by scanning
 * all package.json / requirements.txt / pyproject.toml / composer.json files.
 *
 * Validation-library detection covers JS/TS, Python, and PHP ecosystems.
 *
 * Code scanning detection supports:
 * - GitHub CodeQL default setup
 * - Custom CodeQL workflow files (.github/workflows/*.yml with codeql-action)
 * - Third-party SARIF uploaders
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

const JS_VALIDATION_PACKAGES = [
  'zod',
  'yup',
  'joi',
  '@effect/schema',
  'effect',
  'valibot',
  'ajv',
  'class-validator',
  'io-ts',
  'superstruct',
  'runtypes',
];

const PY_VALIDATION_PACKAGES = [
  'pydantic',
  'marshmallow',
  'cerberus',
  'voluptuous',
  'jsonschema',
  'schematics',
  'typeguard',
];

const PHP_VALIDATION_PACKAGES = [
  'laravel/framework',
  'respect/validation',
  'symfony/validator',
  'vlucas/valitron',
];

const TARGET_FILES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'composer.json',
];

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

interface ValidationMatch {
  library: string;
  file: string;
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

const decodeFile = (file: GitHubFileResponse): string => {
  if (!file?.content) return '';
  if (file.encoding === 'base64') {
    return Buffer.from(file.content, 'base64').toString('utf-8');
  }
  return file.content;
};

const getFileName = (path: string): string => {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
};

export const sanitizedInputsCheck: IntegrationCheck = {
  id: 'sanitized_inputs',
  name: 'Sanitized Inputs & Code Scanning',
  description:
    'Verifies repositories use a supported input-validation library (JS/TS, Python, or PHP) and have GitHub CodeQL scanning enabled. Scans entire repository including monorepo subdirectories.',
  service: 'code-security',
  taskMapping: TASK_TEMPLATES.sanitizedInputs,
  defaultSeverity: 'medium',
  variables: [targetReposVariable],

  run: async (ctx) => {
    const targetReposRaw = (ctx.variables.target_repos as string[] | undefined) ?? [];
    // Extract just the repo names (values may be in "owner/repo:branch" format)
    const targetRepos = targetReposRaw.map((v) => parseRepoBranch(v).repo);

    if (targetRepos.length === 0) {
      ctx.fail({
        title: 'No repositories selected',
        description:
          'Select at least one repository to monitor in the integration settings so we can verify sanitized inputs.',
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

    const checkPackageJson = (content: string, filePath: string): ValidationMatch | null => {
      try {
        const pkg = JSON.parse(content);
        const deps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };
        for (const candidate of JS_VALIDATION_PACKAGES) {
          if (deps[candidate]) {
            return { library: candidate, file: filePath };
          }
        }
      } catch {
        // Invalid JSON, skip
      }
      return null;
    };

    const escapeRegex = (s: string): string =>
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const checkPythonFile = (
      content: string,
      filePath: string,
      fileName: string,
    ): ValidationMatch | null => {
      // Parse line-by-line so we can strip comments and match package names as
      // standalone tokens (e.g. don't match "schema" inside "jsonschema" or inside
      // a prose comment).
      //
      // Comment syntax differs between the two Python dependency file formats:
      //   - pyproject.toml (TOML): `#` starts a comment anywhere outside a string.
      //     Dependency values are always quoted, so stripping at any `#` is safe
      //     — the package name in `"name @ url#egg=name"` appears before the URL.
      //   - requirements.txt (pip): `#` only starts a comment when preceded by
      //     whitespace (or at line start). This preserves VCS URL fragments like
      //     `git+https://...#egg=pydantic` used for editable installs.
      const isTOML = fileName === 'pyproject.toml';
      const stripCommentRegex = isTOML ? /#.*$/ : /(^|\s)#.*$/;
      const lines = content.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.replace(stripCommentRegex, '').toLowerCase();
        if (!line.trim()) continue;
        for (const candidate of PY_VALIDATION_PACKAGES) {
          const escaped = escapeRegex(candidate.toLowerCase());
          // Match the package name as a standalone token. Leading context: start
          // of line or a separator commonly preceding a package name (whitespace,
          // quote, bracket, comma, semicolon, or `=` for `#egg=name` VCS syntax).
          // Trailing context: end of line or a separator that can follow a
          // package name (whitespace, version operator, bracket, quote, comma,
          // semicolon).
          const pattern = new RegExp(
            `(?:^|[\\s"'\\[,;=])${escaped}(?:$|[\\s=<>!~\\[\\]"',;])`,
          );
          if (pattern.test(line)) {
            return { library: candidate, file: filePath };
          }
        }
      }
      return null;
    };

    const checkComposerJson = (content: string, filePath: string): ValidationMatch | null => {
      try {
        const pkg = JSON.parse(content);
        const deps = {
          ...(pkg.require || {}),
          ...(pkg['require-dev'] || {}),
        };
        for (const candidate of PHP_VALIDATION_PACKAGES) {
          if (deps[candidate]) {
            return { library: candidate, file: filePath };
          }
        }
      } catch {
        // Invalid JSON, skip
      }
      return null;
    };

    const findValidationLibraries = async (
      repoName: string,
      tree: GitHubTreeEntry[],
    ): Promise<ValidationMatch[]> => {
      const matches: ValidationMatch[] = [];

      // Find all target files in the tree
      const targetEntries = tree.filter(
        (entry) => entry.type === 'blob' && TARGET_FILES.includes(getFileName(entry.path)),
      );

      for (const entry of targetEntries) {
        const content = await fetchFile(repoName, entry.path);
        if (!content) continue;

        const fileName = getFileName(entry.path);

        if (fileName === 'package.json') {
          const match = checkPackageJson(content, entry.path);
          if (match) matches.push(match);
        } else if (fileName === 'requirements.txt' || fileName === 'pyproject.toml') {
          const match = checkPythonFile(content, entry.path, fileName);
          if (match) matches.push(match);
        } else if (fileName === 'composer.json') {
          const match = checkComposerJson(content, entry.path);
          if (match) matches.push(match);
        }
      }

      return matches;
    };

    /**
     * Check if a workflow file contains code scanning configuration
     */
    const hasCodeScanningInWorkflow = (content: string): boolean => {
      const lower = content.toLowerCase();
      return CODE_SCANNING_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
    };

    /**
     * Find workflow files that configure code scanning
     */
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

      const codeScanningWorkflows: string[] = [];

      for (const entry of workflowFiles) {
        const content = await fetchFile(repoName, entry.path);
        if (content && hasCodeScanningInWorkflow(content)) {
          codeScanningWorkflows.push(entry.path);
        }
      }

      return codeScanningWorkflows;
    };

    /**
     * Check code scanning status using multiple detection methods
     */
    const getCodeScanningStatus = async ({
      repoName,
      tree,
      isPrivate,
      isGhasEnabled,
    }: {
      repoName: string;
      tree: GitHubTreeEntry[];
      isPrivate: boolean;
      isGhasEnabled: boolean;
    }): Promise<CodeScanningStatus> => {
      let apiGot403 = false;

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
          // The code-scanning API requires GHAS for private repos, but reading
          // workflow file contents only requires contents:read. A 403 here does
          // not mean we can't check for code scanning workflows.
          ctx.log(
            `Code scanning API returned 403 for ${repoName} (private: ${isPrivate}, ghas: ${isGhasEnabled}). Falling back to workflow file scanning.`,
          );
          apiGot403 = true;
        } else {
          // Other errors - API might not be available, continue to check workflows
          ctx.log(`Code scanning default setup not available for ${repoName}: ${errorStr}`);
        }
      }

      // Fall back to checking for workflow files with code scanning
      // This catches repos using third-party SAST tools (Semgrep, Snyk, Trivy, etc.)
      // that upload SARIF results via github/codeql-action/upload-sarif
      const codeScanningWorkflows = await findCodeScanningWorkflows(repoName, tree);
      if (codeScanningWorkflows.length > 0) {
        return {
          status: 'enabled',
          method: 'workflow',
          workflow: codeScanningWorkflows[0],
        };
      }

      // No workflows found either - determine appropriate failure status
      if (apiGot403) {
        if (isPrivate) {
          if (isGhasEnabled) {
            return { status: 'permission-denied', isPrivate };
          }
          return { status: 'ghas-required' };
        }
        return { status: 'permission-denied', isPrivate };
      }

      return { status: 'not-configured' };
    };

    for (const repoName of targetRepos) {
      const repo = await fetchRepo(repoName);
      if (!repo) continue;

      // Fetch the full tree to find all package.json/requirements.txt files
      const tree = await fetchRepoTree(repo.full_name, repo.default_branch);
      const validationMatches = await findValidationLibraries(repo.full_name, tree);

      // Check if GHAS is enabled (for private repos, this helps distinguish permission issues)
      const isGhasEnabled = repo.security_and_analysis?.advanced_security?.status === 'enabled';

      const codeScanningStatus = await getCodeScanningStatus({
        repoName: repo.full_name,
        tree,
        isPrivate: repo.private,
        isGhasEnabled,
      });

      // Report input validation results
      if (validationMatches.length > 0) {
        ctx.pass({
          title: `Input validation enabled in ${repo.name}`,
          description: `Found ${validationMatches.length} location(s) with validation libraries: ${validationMatches.map((m) => `${m.library} (${m.file})`).join(', ')}.`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            [repo.full_name]: {
              validation: {
                status: 'enabled',
                matches: validationMatches,
                checked_at: new Date().toISOString(),
              },
            },
          },
        });
      } else {
        const checkedFiles = tree
          .filter((e) => e.type === 'blob' && TARGET_FILES.includes(getFileName(e.path)))
          .map((e) => e.path);

        const supportedLibraries = [
          ...JS_VALIDATION_PACKAGES,
          ...PY_VALIDATION_PACKAGES,
          ...PHP_VALIDATION_PACKAGES,
        ].join(', ');

        ctx.fail({
          title: `No input validation library found in ${repo.name}`,
          description: `Could not detect a supported validation library in any package.json, requirements.txt, pyproject.toml, or composer.json. Checked for: ${supportedLibraries}. If you use a different library, you can mark this task manually with evidence.`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation:
            'Add a supported input-validation library (e.g. Zod/Yup/Joi/Valibot for JS/TS, Pydantic/Marshmallow for Python, Laravel/Respect-Validation for PHP) to enforce schema validation on inbound data.',
          evidence: {
            [repo.full_name]: {
              validation: {
                status: 'not_found',
                checked_files:
                  checkedFiles.length > 0 ? checkedFiles : ['No dependency files found'],
                checked_at: new Date().toISOString(),
              },
            },
          },
        });
      }

      // Report code scanning results based on status
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

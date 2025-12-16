/**
 * Sanitized Inputs Check
 *
 * Ensures repositories use a modern validation/sanitization library
 * (Zod or Pydantic) and have automated static analysis (CodeQL) enabled.
 * Supports monorepos by scanning all package.json/requirements.txt files.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type {
  GitHubCodeScanningDefaultSetup,
  GitHubRepo,
  GitHubTreeEntry,
  GitHubTreeResponse,
} from '../types';
import { targetReposVariable } from '../variables';

const JS_VALIDATION_PACKAGES = ['zod'];
const PY_VALIDATION_PACKAGES = ['pydantic'];

const TARGET_FILES = ['package.json', 'requirements.txt', 'pyproject.toml'];

interface GitHubFileResponse {
  content: string;
  encoding: 'base64' | 'utf-8';
  path: string;
}

interface ValidationMatch {
  library: string;
  file: string;
}

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
    'Verifies repositories use Zod/Pydantic for input validation and have GitHub CodeQL scanning enabled. Scans entire repository including monorepo subdirectories.',
  taskMapping: TASK_TEMPLATES.sanitizedInputs,
  defaultSeverity: 'medium',
  variables: [targetReposVariable],

  run: async (ctx) => {
    const targetRepos = (ctx.variables.target_repos as string[] | undefined) ?? [];

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

    const checkPythonFile = (content: string, filePath: string): ValidationMatch | null => {
      const lower = content.toLowerCase();
      for (const candidate of PY_VALIDATION_PACKAGES) {
        if (lower.includes(candidate)) {
          return { library: candidate, file: filePath };
        }
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
          const match = checkPythonFile(content, entry.path);
          if (match) matches.push(match);
        }
      }

      return matches;
    };

    const isCodeScanningEnabled = async (repoName: string) => {
      try {
        const setup = await ctx.fetch<GitHubCodeScanningDefaultSetup>(
          `/repos/${repoName}/code-scanning/default-setup`,
        );
        return setup.state === 'configured'
          ? { enabled: true, languages: setup.languages || [] }
          : { enabled: false, languages: setup.languages || [] };
      } catch (error) {
        ctx.log(`Code scanning not configured for ${repoName}: ${String(error)}`);
        return { enabled: false };
      }
    };

    for (const repoName of targetRepos) {
      const repo = await fetchRepo(repoName);
      if (!repo) continue;

      // Fetch the full tree to find all package.json/requirements.txt files
      const tree = await fetchRepoTree(repo.full_name, repo.default_branch);
      const validationMatches = await findValidationLibraries(repo.full_name, tree);
      const codeScanning = await isCodeScanningEnabled(repo.full_name);

      if (validationMatches.length > 0) {
        ctx.pass({
          title: `Input validation enabled in ${repo.name}`,
          description: `Found ${validationMatches.length} location(s) with validation libraries: ${validationMatches.map((m) => `${m.library} (${m.file})`).join(', ')}.`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            repository: repo.full_name,
            matches: validationMatches,
            checkedAt: new Date().toISOString(),
          },
        });
      } else {
        const checkedFiles = tree
          .filter((e) => e.type === 'blob' && TARGET_FILES.includes(getFileName(e.path)))
          .map((e) => e.path);

        ctx.fail({
          title: `No input validation library found in ${repo.name}`,
          description:
            'Could not detect Zod or Pydantic in any package.json, requirements.txt, or pyproject.toml. Implement input validation and sanitization using one of these libraries.',
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation:
            'Add Zod (JavaScript/TypeScript) or Pydantic (Python) to enforce schema validation on inbound data.',
          evidence: {
            repository: repo.full_name,
            checkedFiles: checkedFiles.length > 0 ? checkedFiles : ['No dependency files found'],
          },
        });
      }

      if (codeScanning.enabled) {
        ctx.pass({
          title: `CodeQL scanning configured for ${repo.name}`,
          description: 'GitHub CodeQL default setup is enabled.',
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            repository: repo.full_name,
            codeScanning: 'CodeQL default setup',
            languages: codeScanning.languages,
            checkedAt: new Date().toISOString(),
          },
        });
      } else {
        ctx.fail({
          title: `Code scanning not enabled for ${repo.name}`,
          description:
            'GitHub CodeQL (or an equivalent static analysis tool) is not configured. Enable it to automatically detect insecure patterns.',
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation:
            'In the repository Security tab, enable CodeQL default setup (or add a custom workflow) to run on every push.',
        });
      }
    }
  },
};

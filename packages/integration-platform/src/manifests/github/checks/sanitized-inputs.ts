/**
 * Sanitized Inputs Check
 *
 * Ensures repositories use a modern validation/sanitization library
 * (Zod or Pydantic) and have automated static analysis (CodeQL) enabled.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import { targetReposVariable } from '../variables';
import type { GitHubRepo, GitHubCodeScanningDefaultSetup } from '../types';

const JS_VALIDATION_PACKAGES = ['zod'];
const PY_VALIDATION_PACKAGES = ['pydantic'];

interface GitHubFileResponse {
  content: string;
  encoding: 'base64' | 'utf-8';
  path: string;
}

const decodeFile = (file: GitHubFileResponse): string => {
  if (!file?.content) return '';
  if (file.encoding === 'base64') {
    return Buffer.from(file.content, 'base64').toString('utf-8');
  }
  return file.content;
};

export const sanitizedInputsCheck: IntegrationCheck = {
  id: 'sanitized_inputs',
  name: 'Sanitized Inputs & Code Scanning',
  description:
    'Verifies repositories use Zod/Pydantic for input validation and have GitHub CodeQL scanning enabled.',
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

    const fetchFile = async (repoName: string, path: string): Promise<string | null> => {
      try {
        const file = await ctx.fetch<GitHubFileResponse>(`/repos/${repoName}/contents/${path}`);
        return decodeFile(file);
      } catch {
        return null;
      }
    };

    const hasValidationLibrary = async (repoName: string) => {
      // Check package.json for JS libraries
      const packageJsonRaw = await fetchFile(repoName, 'package.json');
      if (packageJsonRaw) {
        try {
          const pkg = JSON.parse(packageJsonRaw);
          const deps = {
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {}),
          };
          for (const candidate of JS_VALIDATION_PACKAGES) {
            if (deps[candidate]) {
              return { found: true, library: candidate, file: 'package.json' };
            }
          }
        } catch {
          ctx.warn(`Unable to parse package.json for ${repoName}`);
        }
      }

      // Check requirements.txt or pyproject.toml for Python libraries
      const requirementsRaw = await fetchFile(repoName, 'requirements.txt');
      if (requirementsRaw) {
        const lower = requirementsRaw.toLowerCase();
        const candidate = PY_VALIDATION_PACKAGES.find((pkg) => lower.includes(pkg));
        if (candidate) {
          return { found: true, library: candidate, file: 'requirements.txt' };
        }
      }

      const pyprojectRaw = await fetchFile(repoName, 'pyproject.toml');
      if (pyprojectRaw) {
        const lower = pyprojectRaw.toLowerCase();
        const candidate = PY_VALIDATION_PACKAGES.find((pkg) => lower.includes(pkg));
        if (candidate) {
          return { found: true, library: candidate, file: 'pyproject.toml' };
        }
      }

      return { found: false };
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

      const validation = await hasValidationLibrary(repo.full_name);
      const codeScanning = await isCodeScanningEnabled(repo.full_name);

      if (validation.found) {
        ctx.pass({
          title: `Input validation enabled in ${repo.name}`,
          description: `Detected ${validation.library} usage (${validation.file}).`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            repository: repo.full_name,
            library: validation.library,
            file: validation.file,
            checkedAt: new Date().toISOString(),
          },
        });
      } else {
        ctx.fail({
          title: `No input validation library found in ${repo.name}`,
          description:
            'Could not detect Zod or Pydantic. Implement input validation and sanitization using one of these libraries.',
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation:
            'Add Zod (JavaScript/TypeScript) or Pydantic (Python) to enforce schema validation on inbound data.',
          evidence: {
            repository: repo.full_name,
            checkedFiles: ['package.json', 'requirements.txt', 'pyproject.toml'],
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



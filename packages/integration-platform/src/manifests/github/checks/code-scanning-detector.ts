/**
 * Code scanning detection logic for the Code Scanning check.
 * Determines whether a repo has CodeQL or an equivalent static analysis
 * tool configured, falling back from the default-setup API to scanning
 * workflow files for SARIF uploaders.
 */

import type { CheckContext } from '../../../types';
import type { GitHubCodeScanningDefaultSetup, GitHubTreeEntry } from '../types';

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

export type CodeScanningStatus =
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

const hasCodeScanningInWorkflow = (content: string): boolean => {
  const lower = content.toLowerCase();
  return CODE_SCANNING_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
};

const findCodeScanningWorkflows = async (
  ctx: CheckContext,
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
    try {
      const file = await ctx.fetch<GitHubFileResponse>(
        `/repos/${repoName}/contents/${entry.path}`,
      );
      const content = decodeFile(file);
      if (content && hasCodeScanningInWorkflow(content)) {
        codeScanningWorkflows.push(entry.path);
      }
    } catch {
      // Skip workflows we can't read
    }
  }

  return codeScanningWorkflows;
};

export const getCodeScanningStatus = async ({
  ctx,
  repoName,
  tree,
  isPrivate,
  isGhasEnabled,
}: {
  ctx: CheckContext;
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
      ctx.log(`Code scanning default setup not available for ${repoName}: ${errorStr}`);
    }
  }

  // Fall back to checking for workflow files with code scanning.
  // This catches repos using third-party SAST tools (Semgrep, Snyk, Trivy, etc.)
  // that upload SARIF results via github/codeql-action/upload-sarif.
  const codeScanningWorkflows = await findCodeScanningWorkflows(ctx, repoName, tree);
  if (codeScanningWorkflows.length > 0) {
    return {
      status: 'enabled',
      method: 'workflow',
      workflow: codeScanningWorkflows[0],
    };
  }

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

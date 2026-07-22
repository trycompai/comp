import { describe, expect, it } from 'bun:test';
import type { CheckContext } from '../../../../types';
import type { GitHubRepo } from '../../types';
import { codeScanningCheck } from '../code-scanning';

// GitHub's real 403 bodies for the code-scanning API.
const FEATURE_OFF_BODY =
  '{"message":"Code Security must be enabled for this repository to use code scanning.","status":"403"}';
const NOT_ACCESSIBLE_BODY = '{"message":"Resource not accessible by integration","status":"403"}';

type SecurityStatus = 'enabled' | 'disabled';

interface RepoConfig {
  private: boolean;
  /**
   * `advanced_security.status` (the legacy field, still sent by GitHub Enterprise
   * Server / older payloads). `undefined` means GitHub omitted the whole
   * `security_and_analysis` block — what happens over a connection without
   * repo-admin visibility.
   */
  ghas?: SecurityStatus;
  /**
   * `code_security.status` — GitHub's 2026 Code Security GA renamed the
   * code-scanning entitlement to this. Newer payloads carry it instead of `ghas`.
   */
  codeSecurity?: SecurityStatus;
  /** When set, the code-scanning default-setup API 403s with this body. */
  defaultSetup403Body?: string;
  /** default-setup returns `state: 'configured'` (code scanning is on). */
  defaultSetupConfigured?: boolean;
  /** Workflow files present in the repo tree: path → file content. */
  workflowFiles?: Record<string, string>;
}

const makeRepo = (fullName: string, config: RepoConfig): GitHubRepo => {
  const [owner, name] = fullName.split('/');
  const repo: GitHubRepo = {
    id: 1,
    name: name!,
    full_name: fullName,
    html_url: `https://github.com/${fullName}`,
    private: config.private,
    default_branch: 'main',
    owner: { login: owner!, type: 'Organization' },
  };
  if (config.ghas || config.codeSecurity) {
    repo.security_and_analysis = {
      ...(config.codeSecurity ? { code_security: { status: config.codeSecurity } } : {}),
      ...(config.ghas ? { advanced_security: { status: config.ghas } } : {}),
    };
  }
  return repo;
};

// Mirrors how ctx.fetch surfaces an HTTP error: the response body is appended to
// the message, so the check can read GitHub's own explanation from `String(error)`.
const httpError = (status: number, body: string): Error =>
  new Error(`HTTP ${status}: Forbidden - ${body}`);

interface FailResult {
  resourceId: string;
  title: string;
  description: string;
  remediation?: string;
}

interface RunResult {
  passed: Array<{ resourceId: string; title: string }>;
  failed: FailResult[];
}

async function runCheck(repos: Record<string, RepoConfig>): Promise<RunResult> {
  const passed: RunResult['passed'] = [];
  const failed: RunResult['failed'] = [];

  const ctx = {
    accessToken: 'tok',
    credentials: {},
    variables: { target_repos: Object.keys(repos) },
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: () => {},
    warn: () => {},
    error: () => {},
    pass: (result) => {
      passed.push({ resourceId: result.resourceId ?? '', title: result.title });
    },
    fail: (result) => {
      failed.push({
        resourceId: result.resourceId ?? '',
        title: result.title,
        description: result.description,
        remediation: result.remediation,
      });
    },
    fetch: (async <T>(path: string): Promise<T> => {
      // /repos/<owner>/<repo>
      const repoMatch = path.match(/^\/repos\/([^/]+\/[^/]+)$/);
      if (repoMatch) {
        const fullName = repoMatch[1]!;
        const config = repos[fullName];
        if (!config) throw httpError(404, 'repo');
        return makeRepo(fullName, config) as unknown as T;
      }

      // /repos/<owner>/<repo>/code-scanning/default-setup
      const setupMatch = path.match(/^\/repos\/([^/]+\/[^/]+)\/code-scanning\/default-setup$/);
      if (setupMatch) {
        const config = repos[setupMatch[1]!]!;
        if (config.defaultSetup403Body) throw httpError(403, config.defaultSetup403Body);
        if (config.defaultSetupConfigured) {
          return { state: 'configured', languages: ['javascript'] } as unknown as T;
        }
        return { state: 'not-configured' } as unknown as T;
      }

      // /repos/<owner>/<repo>/git/trees/<branch>?recursive=1
      const treeMatch = path.match(/^\/repos\/([^/]+\/[^/]+)\/git\/trees\/.+/);
      if (treeMatch) {
        const config = repos[treeMatch[1]!]!;
        const tree = Object.keys(config.workflowFiles ?? {}).map((p) => ({
          path: p,
          type: 'blob' as const,
        }));
        return { sha: 'x', url: '', truncated: false, tree } as unknown as T;
      }

      // /repos/<owner>/<repo>/contents/<path>
      const contentsMatch = path.match(/^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/);
      if (contentsMatch) {
        const content = repos[contentsMatch[1]!]?.workflowFiles?.[contentsMatch[2]!];
        if (content == null) throw httpError(404, 'contents');
        return { path: contentsMatch[2]!, encoding: 'utf-8', content } as unknown as T;
      }

      throw new Error(`Unexpected fetch: ${path}`);
    }) as CheckContext['fetch'],
    fetchAllPages: (async () => []) as CheckContext['fetchAllPages'],
    fetchWithCursor: (async () => []) as CheckContext['fetchWithCursor'],
    fetchWithLinkHeader: (async () => []) as CheckContext['fetchWithLinkHeader'],
    graphql: (async () => ({})) as CheckContext['graphql'],
    getState: (async () => null) as CheckContext['getState'],
    setState: (async () => {}) as CheckContext['setState'],
  } as CheckContext;

  await codeScanningCheck.run(ctx);
  return { passed, failed };
}

describe('codeScanningCheck GHAS visibility (regression: CS-756)', () => {
  it('does NOT report GHAS required when the feature is visible-but-unknown and the API 403s for permission (OAuth non-admin)', async () => {
    // OAuth token without repo-admin visibility on a private repo that actually
    // HAS code scanning enabled. GitHub omits the `security_and_analysis` block
    // AND 403s the code-scanning API with a permission ("not accessible") body —
    // NOT a "must be enabled" body. We cannot confirm the feature is off, so we
    // must not falsely claim it is.
    const { passed, failed } = await runCheck({
      'saltbox/s1-app-monitor': { private: true, defaultSetup403Body: NOT_ACCESSIBLE_BODY },
    });

    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toBe('Cannot access code scanning configuration for s1-app-monitor');
    expect(failed[0]!.title).not.toContain('requires GitHub');
  });

  it('still reports Code Security required when it is positively disabled on a private repo', async () => {
    const { failed } = await runCheck({
      'acme/no-ghas': { private: true, ghas: 'disabled', defaultSetup403Body: NOT_ACCESSIBLE_BODY },
    });

    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toBe('Code scanning requires GitHub Code Security for no-ghas');
  });

  it('reports permission-denied (not Code Security required) when GHAS is enabled but the API still 403s for permission', async () => {
    const { failed } = await runCheck({
      'acme/ghas-on': { private: true, ghas: 'enabled', defaultSetup403Body: NOT_ACCESSIBLE_BODY },
    });

    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toBe('Cannot access code scanning configuration for ghas-on');
  });
});

describe('codeScanningCheck feature-off vs permission (regression: CS-762)', () => {
  it('private repo with Code Security disabled (new code_security field) → "requires Code Security", NOT a permission error', async () => {
    // The exact CS-762 case: GitHub's 2026 payload carries `code_security`
    // (not `advanced_security`) and the 403 body says the feature must be enabled.
    const { passed, failed } = await runCheck({
      'acme/webapp': {
        private: true,
        codeSecurity: 'disabled',
        defaultSetup403Body: FEATURE_OFF_BODY,
      },
    });

    expect(passed).toEqual([]);
    expect(failed).toHaveLength(1);
    const finding = failed[0]!;
    expect(finding.title).toBe('Code scanning requires GitHub Code Security for webapp');
    // Must NOT surface the misleading permission message or the wrong remediation.
    expect(finding.description).not.toContain('does not have permission');
    expect(finding.remediation).not.toContain('Code scanning alerts: Read');
  });

  it('403 "must be enabled" body wins even when security_and_analysis is omitted (unknown)', async () => {
    const { failed } = await runCheck({
      'acme/api': { private: true, defaultSetup403Body: FEATURE_OFF_BODY },
    });

    expect(failed.map((f) => f.title)).toEqual([
      'Code scanning requires GitHub Code Security for api',
    ]);
  });

  it('public repo with a "must be enabled" 403 → not-configured (never a permission error)', async () => {
    const { failed } = await runCheck({
      'acme/public': { private: false, defaultSetup403Body: FEATURE_OFF_BODY },
    });

    expect(failed.map((f) => f.title)).toEqual(['Code scanning not enabled for public']);
  });

  it('genuine "Resource not accessible" 403 → permission-denied with an accurate remediation', async () => {
    const { failed } = await runCheck({
      'acme/secret': { private: true, defaultSetup403Body: NOT_ACCESSIBLE_BODY },
    });

    expect(failed).toHaveLength(1);
    const finding = failed[0]!;
    expect(finding.title).toBe('Cannot access code scanning configuration for secret');
    expect(finding.description).toContain('Administration: read');
    expect(finding.remediation).not.toContain('Code scanning alerts: Read');
  });

  it('default setup configured → pass', async () => {
    const { passed, failed } = await runCheck({
      'acme/scanned': { private: true, codeSecurity: 'enabled', defaultSetupConfigured: true },
    });

    expect(failed).toEqual([]);
    expect(passed.map((p) => p.title)).toEqual(['CodeQL scanning configured for scanned']);
  });

  it('third-party SAST workflow satisfies the check even when the API 403s', async () => {
    const { passed, failed } = await runCheck({
      'acme/sast': {
        private: true,
        defaultSetup403Body: FEATURE_OFF_BODY,
        workflowFiles: {
          '.github/workflows/security.yml':
            'jobs:\n  scan:\n    steps:\n      - uses: github/codeql-action/upload-sarif@v3',
        },
      },
    });

    expect(failed).toEqual([]);
    expect(passed.map((p) => p.title)).toEqual(['CodeQL scanning configured for sast']);
  });
});

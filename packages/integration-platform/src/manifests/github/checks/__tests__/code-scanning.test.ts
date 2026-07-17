import { describe, expect, it } from 'bun:test';
import type { CheckContext } from '../../../../types';
import type { GitHubRepo } from '../../types';
import { codeScanningCheck } from '../code-scanning';

interface RepoConfig {
  private: boolean;
  /**
   * `advanced_security.status`. `undefined` means GitHub omitted the
   * `security_and_analysis` block entirely — which is what happens over an OAuth
   * connection whose user lacks repo-admin visibility.
   */
  ghas?: 'enabled' | 'disabled';
  /** Whether the code-scanning default-setup API 403s (permission/GHAS gate). */
  defaultSetup403?: boolean;
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
  if (config.ghas) {
    repo.security_and_analysis = { advanced_security: { status: config.ghas } };
  }
  return repo;
};

interface RunResult {
  passed: Array<{ resourceId: string; title: string }>;
  failed: Array<{ resourceId: string; title: string }>;
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
    pass: (result) => {
      passed.push({ resourceId: result.resourceId ?? '', title: result.title });
    },
    fail: (result) => {
      failed.push({ resourceId: result.resourceId ?? '', title: result.title });
    },
    fetch: (async <T>(path: string): Promise<T> => {
      // /repos/<owner>/<repo>
      const repoMatch = path.match(/^\/repos\/([^/]+\/[^/]+)$/);
      if (repoMatch) {
        const fullName = repoMatch[1]!;
        const config = repos[fullName];
        if (!config) throw new Error(`404 ${path}`);
        return makeRepo(fullName, config) as unknown as T;
      }

      // /repos/<owner>/<repo>/code-scanning/default-setup
      const setupMatch = path.match(/^\/repos\/([^/]+\/[^/]+)\/code-scanning\/default-setup$/);
      if (setupMatch) {
        const config = repos[setupMatch[1]!]!;
        // GitHub 403s this endpoint for private repos when the token lacks the
        // repo-admin visibility the code-scanning API requires (and, separately,
        // when GHAS is off). Both surface identically to us.
        if (config.defaultSetup403) throw new Error(`403 Forbidden: ${path}`);
        return { state: 'not-configured' } as unknown as T;
      }

      // /repos/<owner>/<repo>/git/trees/<branch>?recursive=1 — no workflow files
      // (default-setup repos carry no CodeQL .yml).
      if (/^\/repos\/[^/]+\/[^/]+\/git\/trees\/.+/.test(path)) {
        return { sha: 'x', url: '', truncated: false, tree: [] } as unknown as T;
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
  it('does NOT report GHAS required when GHAS status is unknown (OAuth non-admin: 403 + private + no security_and_analysis block)', async () => {
    // Saltbox repro: OAuth token without repo-admin visibility on a private repo
    // that actually HAS GHAS + CodeQL default setup enabled. GitHub omits the
    // `security_and_analysis` block AND 403s the code-scanning API. We cannot
    // confirm GHAS is off, so we must not falsely claim it is.
    const { passed, failed } = await runCheck({
      'saltbox/s1-app-monitor': { private: true, defaultSetup403: true }, // ghas block omitted
    });

    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    // Before the fix this was:
    //   "Code scanning requires GitHub Advanced Security for s1-app-monitor"
    expect(failed[0]!.title).toBe('Cannot access code scanning configuration for s1-app-monitor');
    expect(failed[0]!.title).not.toContain('requires GitHub Advanced Security');
  });

  it('still reports GHAS required when GHAS is positively disabled on a private repo', async () => {
    const { failed } = await runCheck({
      'acme/no-ghas': { private: true, ghas: 'disabled', defaultSetup403: true },
    });

    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toBe('Code scanning requires GitHub Advanced Security for no-ghas');
  });

  it('reports permission-denied (not GHAS required) when GHAS is enabled but the API still 403s', async () => {
    const { failed } = await runCheck({
      'acme/ghas-on': { private: true, ghas: 'enabled', defaultSetup403: true },
    });

    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toBe('Cannot access code scanning configuration for ghas-on');
  });
});

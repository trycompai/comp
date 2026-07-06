import { describe, expect, it } from 'bun:test';
import type { CheckContext } from '../../../../types';
import type { GitHubBranchRule, GitHubRepo } from '../../types';
import { branchProtectionCheck } from '../branch-protection';
import { REPO_CHECK_CONCURRENCY } from '../concurrency';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type RepoState = 'protected' | 'unprotected' | 'missing';

interface RunResult {
  passed: Array<{ resourceId: string; title: string }>;
  failed: Array<{ resourceId: string; title: string }>;
  /** Peak number of repositories whose top-level fetch was in flight at once. */
  maxInFlight: number;
}

const makeRepo = (fullName: string): GitHubRepo =>
  ({
    id: 1,
    name: fullName.split('/')[1]!,
    full_name: fullName,
    private: true,
    html_url: `https://github.com/${fullName}`,
    default_branch: 'main',
    owner: { login: fullName.split('/')[0]!, type: 'Organization' },
  }) as GitHubRepo;

async function runCheck(
  repoStates: Record<string, RepoState>,
  { repoFetchDelayMs = 0 }: { repoFetchDelayMs?: number } = {},
): Promise<RunResult> {
  const passed: RunResult['passed'] = [];
  const failed: RunResult['failed'] = [];

  let inFlight = 0;
  let maxInFlight = 0;

  const ctx: CheckContext = {
    accessToken: 'tok',
    credentials: {},
    variables: { target_repos: Object.keys(repoStates) },
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
      // /repos/<owner>/<repo> — the first call each repo makes. Instrument it to
      // measure how many repositories are being processed at the same time.
      const repoMatch = path.match(/^\/repos\/([^/]+\/[^/]+)$/);
      if (repoMatch) {
        const fullName = repoMatch[1]!;
        const state = repoStates[fullName];
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        try {
          if (repoFetchDelayMs > 0) await sleep(repoFetchDelayMs);
          if (!state || state === 'missing') throw new Error(`404 ${path}`);
          return makeRepo(fullName) as unknown as T;
        } finally {
          inFlight -= 1;
        }
      }

      // Strategy 1: /repos/<owner>/<repo>/rules/branches/<branch>
      const rulesMatch = path.match(/^\/repos\/([^/]+\/[^/]+)\/rules\/branches\/.+$/);
      if (rulesMatch) {
        const rules: GitHubBranchRule[] =
          repoStates[rulesMatch[1]!] === 'protected' ? [{ type: 'pull_request' }] : [];
        return rules as unknown as T;
      }

      // Strategy 2: /repos/<owner>/<repo>/rulesets — none configured.
      if (/^\/repos\/[^/]+\/[^/]+\/rulesets$/.test(path)) {
        return [] as unknown as T;
      }

      // Strategy 3: /repos/<owner>/<repo>/branches/<branch>/protection — absent.
      if (/^\/repos\/[^/]+\/[^/]+\/branches\/.+\/protection$/.test(path)) {
        throw new Error(`404 ${path}`);
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

  await branchProtectionCheck.run(ctx);
  return { passed, failed, maxInFlight };
}

describe('branchProtectionCheck concurrency', () => {
  it('checks repositories in parallel, not one-at-a-time (regression: manual-run HTTP timeout)', async () => {
    // With the old serial `for...of` loop the top-level repo fetch was only ever
    // in flight for ONE repo at a time (maxInFlight === 1). For an org with many
    // monitored repos that meant ~250 sequential GitHub calls, which blew past
    // the synchronous manual-run HTTP timeout — the connection died with no
    // result persisted and the UI fell back to "No runs yet". The bounded pool
    // overlaps repos so the run finishes well under that ceiling.
    const repoCount = 12;
    const repoStates: Record<string, RepoState> = {};
    for (let i = 0; i < repoCount; i++) {
      repoStates[`acme/repo-${i}`] = 'protected';
    }

    const { passed, failed, maxInFlight } = await runCheck(repoStates, {
      repoFetchDelayMs: 15,
    });

    // Core regression assertion: repos are no longer processed strictly serially.
    expect(maxInFlight).toBeGreaterThan(1);
    // ...but stay bounded by the pool so we never blast GitHub's rate limits.
    expect(maxInFlight).toBeLessThanOrEqual(REPO_CHECK_CONCURRENCY);
    expect(maxInFlight).toBe(Math.min(REPO_CHECK_CONCURRENCY, repoCount));

    // Correctness is preserved: every repo still produced exactly one result.
    expect(passed).toHaveLength(repoCount);
    expect(failed).toHaveLength(0);
  });
});

describe('branchProtectionCheck results', () => {
  it('emits the correct pass/fail per repo regardless of interleaving', async () => {
    const { passed, failed } = await runCheck({
      'acme/protected': 'protected',
      'acme/unprotected': 'unprotected',
      'acme/missing': 'missing',
    });

    expect(passed.map((p) => p.resourceId).sort()).toEqual(['acme/protected']);
    // Unprotected fails on full_name; a missing repo fails on the raw name.
    expect(failed.map((f) => f.resourceId).sort()).toEqual(['acme/missing', 'acme/unprotected']);

    expect(passed.find((p) => p.resourceId === 'acme/protected')?.title).toBe(
      'All branches protected on protected',
    );
    expect(failed.find((f) => f.resourceId === 'acme/unprotected')?.title).toBe(
      'No branch protection on unprotected',
    );
    expect(failed.find((f) => f.resourceId === 'acme/missing')?.title).toBe(
      'Repository not found: acme/missing',
    );
  });
});

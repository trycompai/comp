import { describe, expect, it } from 'bun:test';
import type {
  CheckContext,
  CheckFindingResult,
  CheckPassingResult,
} from '../../../../types';
import type { GitHubRepo, GitHubTreeEntry, GitHubTreeResponse } from '../../types';
import { sanitizedInputsCheck } from '../sanitized-inputs';

const REPO = 'acme/monorepo';

interface RunOutcome {
  passed: Array<{ resourceId: string; title: string; description: string }>;
  failed: Array<{ resourceId: string; title: string; description: string }>;
  /** Peak number of file-content reads in flight at once. Serial reads peak at 1. */
  maxInFlight: number;
  /** How many `/contents/` reads happened (must cover every dependency file). */
  contentFetches: number;
}

const makeRepo = (): GitHubRepo =>
  ({
    id: 1,
    name: 'monorepo',
    full_name: REPO,
    private: false,
    html_url: `https://github.com/${REPO}`,
    default_branch: 'main',
    owner: { login: 'acme', type: 'Organization' },
  }) as GitHubRepo;

const blob = (path: string): GitHubTreeEntry =>
  ({ path, mode: '100644', type: 'blob', sha: 'x', url: '' }) as GitHubTreeEntry;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSanitizedInputs(params: {
  tree: GitHubTreeEntry[];
  files: Record<string, string>;
}): Promise<RunOutcome> {
  const { tree, files } = params;
  const passed: RunOutcome['passed'] = [];
  const failed: RunOutcome['failed'] = [];

  let inFlight = 0;
  let maxInFlight = 0;
  let contentFetches = 0;

  const ctx = {
    accessToken: 'tok',
    credentials: {},
    variables: { target_repos: [REPO] },
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: () => {},
    warn: () => {},
    error: () => {},
    pass: (result: CheckPassingResult) => {
      passed.push({
        resourceId: result.resourceId,
        title: result.title,
        description: result.description,
      });
    },
    fail: (finding: CheckFindingResult) => {
      failed.push({
        resourceId: finding.resourceId,
        title: finding.title,
        description: finding.description,
      });
    },
    fetch: (async <T,>(path: string): Promise<T> => {
      // Repo metadata: /repos/<owner>/<repo>
      if (/^\/repos\/[^/]+\/[^/]+$/.test(path)) {
        return makeRepo() as unknown as T;
      }
      // Recursive git tree.
      if (path.includes('/git/trees/')) {
        return {
          sha: 'root',
          url: '',
          truncated: false,
          tree,
        } as GitHubTreeResponse as unknown as T;
      }
      // File contents: /repos/<owner>/<repo>/contents/<path>. Track how many of
      // these overlap — the whole point of the fix is that they no longer run
      // strictly one-at-a-time.
      const contentsMatch = path.match(/\/contents\/(.+)$/);
      if (contentsMatch) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        contentFetches += 1;
        try {
          await delay(10);
          const filePath = contentsMatch[1]!;
          const body = files[filePath] ?? '';
          return {
            content: Buffer.from(body, 'utf-8').toString('base64'),
            encoding: 'base64',
            path: filePath,
          } as unknown as T;
        } finally {
          inFlight -= 1;
        }
      }
      throw new Error(`Unexpected fetch: ${path}`);
    }) as CheckContext['fetch'],
  } as CheckContext;

  await sanitizedInputsCheck.run(ctx);
  return { passed, failed, maxInFlight, contentFetches };
}

describe('sanitizedInputsCheck — bounded-concurrency file reads (CS-689)', () => {
  it('reads dependency files concurrently instead of one-at-a-time', async () => {
    // A monorepo with many package.json files. Read serially (the bug), the
    // synchronous manual "Run" blew past the API's HTTP request timeout and the
    // run never completed. Bounded concurrency keeps several reads in flight.
    const count = 24;
    const tree = Array.from({ length: count }, (_, i) => blob(`packages/p${i}/package.json`));
    const files: Record<string, string> = {};
    for (let i = 0; i < count; i += 1) {
      files[`packages/p${i}/package.json`] = JSON.stringify({ dependencies: {} });
    }

    const { failed, maxInFlight, contentFetches } = await runSanitizedInputs({ tree, files });

    // Every dependency file is still read — no silent cap or dropped files.
    expect(contentFetches).toBe(count);
    // The reads overlap. Serial execution (the bug) peaks at exactly 1 in flight.
    expect(maxInFlight).toBeGreaterThan(1);
    // No validation library anywhere -> the repo still fails, exactly as before.
    expect(failed).toHaveLength(1);
  });

  it('still passes and lists every match across the tree when a library is present', async () => {
    const tree = [
      blob('package.json'),
      blob('services/api/requirements.txt'),
      blob('packages/web/package.json'),
    ];
    const files: Record<string, string> = {
      'package.json': JSON.stringify({ dependencies: { lodash: '^4' } }),
      'services/api/requirements.txt': 'flask==3.0\npydantic==2.6\n',
      'packages/web/package.json': JSON.stringify({ dependencies: { zod: '^3' } }),
    };

    const { passed, failed } = await runSanitizedInputs({ tree, files });

    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
    // Matches are still gathered across the entire tree (order preserved).
    expect(passed[0]!.description).toContain('pydantic (services/api/requirements.txt)');
    expect(passed[0]!.description).toContain('zod (packages/web/package.json)');
  });
});

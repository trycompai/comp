// `gcp-security.service.ts` pulls in heavy SCC/IAM clients via the
// constructor flow at import time. We only need to test the OAuth-fetch
// based project-detection paths, so stub @db (Prisma client) before
// importing the service.
jest.mock('@db', () => ({ db: {} }));

import { GCPSecurityService } from './gcp-security.service';

/**
 * Helper: build a Response-like object for a single page of the GCP
 * v1/projects list endpoint. Mirrors the exact shape the real API
 * returns so the production code path is exercised verbatim.
 */
function gcpPage(opts: {
  projects: Array<{ projectId: string; name: string; projectNumber: string }>;
  nextPageToken?: string;
}): { ok: true; json: () => Promise<unknown> } {
  return {
    ok: true,
    json: async () => ({
      projects: opts.projects,
      ...(opts.nextPageToken ? { nextPageToken: opts.nextPageToken } : {}),
    }),
  };
}

function makeProject(suffix: string) {
  return {
    projectId: `proj-${suffix}`,
    name: `Project ${suffix}`,
    projectNumber: `100${suffix}`,
  };
}

describe('GCPSecurityService — project detection', () => {
  let service: GCPSecurityService;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn();
    // @ts-expect-error replacing global fetch with a mock for these tests
    global.fetch = fetchMock;
    service = new GCPSecurityService();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // ─── Pagination through nextPageToken ──────────────────────────────────

  describe('listProjectsPaginated (via detectProjects)', () => {
    it('returns all projects from a single page when no nextPageToken is set', async () => {
      fetchMock.mockResolvedValueOnce(
        gcpPage({ projects: [makeProject('1'), makeProject('2')] }),
      );

      const result = await service.detectProjects('token');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        { id: 'proj-1', name: 'Project 1', number: '1001' },
        { id: 'proj-2', name: 'Project 2', number: '1002' },
      ]);
    });

    it('follows nextPageToken across multiple pages until exhaustion', async () => {
      // Three pages — this is the Greg scenario: a customer with more
      // accessible projects than fit in a single page. Pre-fix, only
      // the first page came back and the folder-nested production
      // projects on later pages were silently dropped.
      fetchMock
        .mockResolvedValueOnce(
          gcpPage({
            projects: [makeProject('1'), makeProject('2')],
            nextPageToken: 'page-2-token',
          }),
        )
        .mockResolvedValueOnce(
          gcpPage({
            projects: [makeProject('3'), makeProject('4')],
            nextPageToken: 'page-3-token',
          }),
        )
        .mockResolvedValueOnce(
          gcpPage({
            projects: [makeProject('5')],
            // no nextPageToken → end of pagination
          }),
        );

      const result = await service.detectProjects('token');

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result.map((p) => p.id)).toEqual([
        'proj-1',
        'proj-2',
        'proj-3',
        'proj-4',
        'proj-5',
      ]);
    });

    it('passes pageToken through to subsequent requests', async () => {
      fetchMock
        .mockResolvedValueOnce(
          gcpPage({
            projects: [makeProject('1')],
            nextPageToken: 'token-for-page-2',
          }),
        )
        .mockResolvedValueOnce(gcpPage({ projects: [makeProject('2')] }));

      await service.detectProjects('access-token-xyz');

      const secondCallUrl = fetchMock.mock.calls[1]?.[0] as string;
      expect(secondCallUrl).toContain('pageToken=token-for-page-2');
    });

    it('returns the projects collected so far when a mid-pagination page fails', async () => {
      // Mid-pagination 500 from GCP — we keep what we got rather than
      // throwing and blanking the picker. Matches the prior failure
      // posture of "best-effort results".
      fetchMock
        .mockResolvedValueOnce(
          gcpPage({
            projects: [makeProject('1'), makeProject('2')],
            nextPageToken: 'page-2',
          }),
        )
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        });

      const result = await service.detectProjects('token');

      expect(result.map((p) => p.id)).toEqual(['proj-1', 'proj-2']);
      // The fallback path doesn't fire because direct returned ≥1.
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('stops paginating at the safety cap (1000 projects) even if more pages remain', async () => {
      // Five 200-project pages → exactly 1000 → cap hit.
      const bigPage = (start: number, count: number, more: boolean) =>
        gcpPage({
          projects: Array.from({ length: count }, (_, i) =>
            makeProject(String(start + i)),
          ),
          ...(more ? { nextPageToken: `next-${start + count}` } : {}),
        });
      fetchMock
        .mockResolvedValueOnce(bigPage(1, 200, true))
        .mockResolvedValueOnce(bigPage(201, 200, true))
        .mockResolvedValueOnce(bigPage(401, 200, true))
        .mockResolvedValueOnce(bigPage(601, 200, true))
        .mockResolvedValueOnce(bigPage(801, 200, true))
        // Sixth page never requested because cap hit.
        .mockResolvedValueOnce(bigPage(1001, 200, false));

      const result = await service.detectProjects('token');

      expect(result).toHaveLength(1000);
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });
  });

  // ─── detectProjectsForOrg: org direct + folder-tree projects ──────────

  /**
   * Build a Response-like for the v3/folders endpoint (response shape
   * is identical to the legacy v2/folders endpoint).
   */
  function foldersPage(opts: {
    folders: string[]; // folder IDs (numeric)
    nextPageToken?: string;
  }): { ok: true; json: () => Promise<unknown> } {
    return {
      ok: true,
      json: async () => ({
        folders: opts.folders.map((id) => ({ name: `folders/${id}` })),
        ...(opts.nextPageToken ? { nextPageToken: opts.nextPageToken } : {}),
      }),
    };
  }

  describe('detectProjectsForOrg', () => {
    it("only queries projects whose parent is this org's direct children OR a folder inside this org's tree (cubic P2)", async () => {
      // Greg's exact scenario:
      //   org 43356919874 (propper.ai)
      //     ├── folder 9724350536 (propper)
      //     │     ├── propperai-prod
      //     │     └── propperai-demo
      //     └── org-root-1                       (direct org child)
      //
      // The folder-nested arm previously used `parent.type:folder`
      // alone, which would have ALSO returned projects under folders
      // in OTHER orgs the caller had access to. The fix enumerates
      // folders under THIS org and queries each by ID, matching GCP's
      // documented happy-path filter shape and properly scoping the
      // result.
      const seenFolderIdsQueried: string[] = [];
      fetchMock.mockImplementation(async (url: string) => {
        // Folder enumeration: top-level folders under the org.
        if (url.includes('v3/folders') && url.includes('organizations%2F43356919874')) {
          return foldersPage({ folders: ['9724350536'] });
        }
        // Folder enumeration: sub-folders (none in this tree).
        if (url.includes('v3/folders') && url.includes('folders%2F9724350536')) {
          return foldersPage({ folders: [] });
        }
        // Direct org children projects.
        if (url.includes('v1/projects') && url.includes('parent.id%3A43356919874')) {
          return gcpPage({
            projects: [
              { projectId: 'org-root-1', name: 'Root Project', projectNumber: '111' },
            ],
          });
        }
        // Per-folder project queries — extract folder ID from filter.
        if (url.includes('v1/projects') && url.includes('parent.type%3Afolder')) {
          const m = url.match(/parent\.id%3A(\d+)/);
          if (m) seenFolderIdsQueried.push(m[1]);
          if (m && m[1] === '9724350536') {
            return gcpPage({
              projects: [
                { projectId: 'propperai-prod', name: 'Propper Prod', projectNumber: '222' },
                { projectId: 'propperai-demo', name: 'Propper Demo', projectNumber: '333' },
              ],
            });
          }
          return gcpPage({ projects: [] });
        }
        throw new Error(`Unexpected fetch URL in test: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', '43356919874');

      const ids = result.map((p) => p.id).sort();
      expect(ids).toEqual(['org-root-1', 'propperai-demo', 'propperai-prod']);
      // ONLY this org's folder was queried — cubic P2 fix.
      expect(seenFolderIdsQueried).toEqual(['9724350536']);
    });

    it('recursively traverses nested folders (org → folder → sub-folder → projects)', async () => {
      // Layout:
      //   org 1000
      //     └── folder 2000 (top)
      //           └── folder 3000 (nested)
      //                 └── project deep-prod
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v3/folders') && url.includes('organizations%2F1000')) {
          return foldersPage({ folders: ['2000'] });
        }
        if (url.includes('v3/folders') && url.includes('folders%2F2000')) {
          return foldersPage({ folders: ['3000'] });
        }
        if (url.includes('v3/folders') && url.includes('folders%2F3000')) {
          return foldersPage({ folders: [] });
        }
        if (url.includes('v1/projects') && url.includes('parent.id%3A1000')) {
          return gcpPage({ projects: [] }); // no direct org children
        }
        if (url.includes('v1/projects') && url.includes('parent.id%3A3000')) {
          return gcpPage({
            projects: [
              { projectId: 'deep-prod', name: 'Deep', projectNumber: '999' },
            ],
          });
        }
        if (url.includes('v1/projects') && url.includes('parent.id%3A2000')) {
          return gcpPage({ projects: [] });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', '1000');
      expect(result.map((p) => p.id)).toEqual(['deep-prod']);
    });

    it('dedupes when the same project would appear in both arms', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v3/folders') && url.includes('organizations%2F123')) {
          return foldersPage({ folders: ['folder-a'] });
        }
        if (url.includes('v3/folders') && url.includes('folders%2Ffolder-a')) {
          return foldersPage({ folders: [] });
        }
        if (url.includes('v1/projects') && url.includes('parent.id%3A123')) {
          return gcpPage({ projects: [makeProject('shared')] });
        }
        if (url.includes('v1/projects') && url.includes('parent.id%3Afolder-a')) {
          return gcpPage({
            projects: [makeProject('shared'), makeProject('unique')],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', '123');
      expect(result.map((p) => p.id)).toEqual(['proj-shared', 'proj-unique']);
    });

    it('returns empty array when both arms (and the broad-query fallback) come back empty', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v3/folders')) return foldersPage({ folders: [] });
        // Catches both the direct arm AND the broad-query fallback.
        if (url.includes('v1/projects')) return gcpPage({ projects: [] });
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', 'empty-org');
      expect(result).toEqual([]);
    });

    it('falls back to broad parent.type:folder query when v3/folders returns 403 PERMISSION_DENIED (customer Propper regression)', async () => {
      // Exact production failure mode: v3/folders returns
      // `403 PERMISSION_DENIED` for some OAuth grants despite the
      // user having org-level folder roles. The fallback MUST fire
      // ONLY for true forbiddens — cubic P2 on PR #2916 noted that
      // an unconditional fallback on "empty folders" would leak
      // cross-org projects for multi-org users whose selected org
      // simply has no folders. See the next test for that case.
      const broadQueryHits: string[] = [];
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v3/folders')) {
          // Real 403 PERMISSION_DENIED body that GCP returns.
          return {
            ok: false,
            status: 403,
            text: async () =>
              JSON.stringify({
                error: {
                  code: 403,
                  message: 'The caller does not have permission',
                  status: 'PERMISSION_DENIED',
                },
              }),
          };
        }
        if (
          url.includes('v1/projects') &&
          url.includes('parent.id%3A43356919874')
        ) {
          return gcpPage({
            projects: [
              { projectId: 'direct-1', name: 'Direct One', projectNumber: '100' },
            ],
          });
        }
        if (
          url.includes('v1/projects') &&
          url.includes('parent.type%3Afolder') &&
          !/parent\.id%3A/.test(url)
        ) {
          broadQueryHits.push(url);
          return gcpPage({
            projects: [
              { projectId: 'propperai-prod', name: 'Propper Prod', projectNumber: '200' },
              { projectId: 'propperai-demo', name: 'Propper Demo', projectNumber: '300' },
            ],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', '43356919874');

      const ids = result.map((p) => p.id).sort();
      expect(ids).toEqual(['direct-1', 'propperai-demo', 'propperai-prod']);
      expect(broadQueryHits).toHaveLength(1);
    });

    it('does NOT fall back to the broad query when the org simply has no folders (cubic P2 fix)', async () => {
      // The previous PR (#2916) fired the broad fallback for ANY
      // empty enumeration result. That meant a multi-org user whose
      // selected org legitimately had no folders would see folder-
      // nested projects from OTHER orgs they had IAM access to —
      // because the broad query is not org-scoped.
      //
      // This test locks in the cubic P2 fix: enumeration returns
      // empty WITHOUT a 403 → no fallback → folder arm returns []
      // and the picker shows only the org's direct children.
      const broadQueryHits: string[] = [];
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v3/folders')) {
          // 200 OK + empty list. NOT a 403. The org just has no
          // folders. Common shape for small single-org tenants too.
          return foldersPage({ folders: [] });
        }
        if (
          url.includes('v1/projects') &&
          url.includes('parent.id%3Aflat-org')
        ) {
          return gcpPage({
            projects: [
              {
                projectId: 'only-direct',
                name: 'Only Direct',
                projectNumber: '900',
              },
            ],
          });
        }
        if (
          url.includes('v1/projects') &&
          url.includes('parent.type%3Afolder') &&
          !/parent\.id%3A/.test(url)
        ) {
          // Would return cross-org projects if the fallback ever
          // fires. Track hits — must be zero.
          broadQueryHits.push(url);
          return gcpPage({
            projects: [
              {
                projectId: 'should-not-appear',
                name: 'Other Org Folder Project',
                projectNumber: '999',
              },
            ],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', 'flat-org');

      expect(result.map((p) => p.id)).toEqual(['only-direct']);
      // The broad fallback must NOT fire. Cubic P2.
      expect(broadQueryHits).toHaveLength(0);
    });

    it('does NOT fire the broad-query fallback when folder enumeration succeeds (precise scoping preserved)', async () => {
      // Multi-org safety: when v3/folders works as expected, we stick
      // with the precise per-folder query so customers in multiple
      // orgs do not see projects from orgs other than the one they
      // selected (the original cubic P2 concern from PR #2899).
      let broadFallbackFired = false;
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v3/folders') && url.includes('organizations%2Fhealthy-org')) {
          return foldersPage({ folders: ['healthy-folder'] });
        }
        if (url.includes('v3/folders')) {
          return foldersPage({ folders: [] }); // no sub-folders
        }
        if (url.includes('parent.id%3Ahealthy-org') && !url.includes('parent.type%3Afolder')) {
          return gcpPage({ projects: [] });
        }
        if (
          url.includes('parent.type%3Afolder') &&
          url.includes('parent.id%3Ahealthy-folder')
        ) {
          return gcpPage({
            projects: [
              { projectId: 'scoped-prod', name: 'Scoped', projectNumber: '500' },
            ],
          });
        }
        // Catch-all: if the broad fallback fires, the test fails.
        if (
          url.includes('parent.type%3Afolder') &&
          !/parent\.id%3A/.test(url)
        ) {
          broadFallbackFired = true;
          return gcpPage({ projects: [] });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', 'healthy-org');
      expect(result.map((p) => p.id)).toEqual(['scoped-prod']);
      expect(broadFallbackFired).toBe(false);
    });

    it('still returns direct-arm projects when the folder arm throws entirely (no-regression guarantee)', async () => {
      // If GCP's v3/folders endpoint throws or returns 4xx, the folder
      // arm collapses to [] gracefully — the direct arm still works
      // and we are at minimum no worse than prod.
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v3/folders')) {
          throw new Error('simulated v3/folders network failure');
        }
        if (url.includes('parent.id%3A555')) {
          return gcpPage({
            projects: [
              { projectId: 'direct-only', name: 'Direct Only', projectNumber: '777' },
            ],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', '555');
      expect(result).toEqual([
        { id: 'direct-only', name: 'Direct Only', number: '777' },
      ]);
    });

    it('still returns folder-arm projects when the direct arm throws', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v1/projects') && url.includes('parent.id%3A666') && !url.includes('parent.type%3Afolder')) {
          throw new Error('simulated direct-arm failure');
        }
        if (url.includes('v3/folders') && url.includes('organizations%2F666')) {
          return foldersPage({ folders: ['folder-x'] });
        }
        if (url.includes('v3/folders')) return foldersPage({ folders: [] });
        if (url.includes('v1/projects') && url.includes('parent.id%3Afolder-x')) {
          return gcpPage({
            projects: [
              { projectId: 'folder-only', name: 'Folder Only', projectNumber: '888' },
            ],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', '666');
      expect(result).toEqual([
        { id: 'folder-only', name: 'Folder Only', number: '888' },
      ]);
    });

    it('caps concurrent folder→projects queries to avoid GCP throttling (cubic P2)', async () => {
      // Pathological tenant: 20 folders under the org. Without a
      // concurrency cap, all 20 project-list calls would fire at once,
      // and any 429s would be silently treated as "empty folder",
      // dropping projects from the picker.
      const FOLDER_COUNT = 20;
      const folderIds = Array.from(
        { length: FOLDER_COUNT },
        (_, i) => `f${i}`,
      );

      let inFlight = 0;
      let maxInFlight = 0;
      const pending: Array<() => void> = [];

      fetchMock.mockImplementation((url: string) => {
        if (
          url.includes('v3/folders') &&
          url.includes('organizations%2Fbig-org')
        ) {
          return Promise.resolve(foldersPage({ folders: folderIds }));
        }
        if (url.includes('v3/folders')) {
          return Promise.resolve(foldersPage({ folders: [] })); // no sub-folders
        }
        if (
          url.includes('v1/projects') &&
          url.includes('parent.id%3Abig-org') &&
          !url.includes('parent.type%3Afolder')
        ) {
          return Promise.resolve(gcpPage({ projects: [] })); // direct arm
        }
        if (
          url.includes('v1/projects') &&
          url.includes('parent.type%3Afolder')
        ) {
          // Per-folder project queries — hold the response so we can
          // observe concurrency.
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          return new Promise((resolve) => {
            pending.push(() => {
              inFlight--;
              resolve(gcpPage({ projects: [] }));
            });
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const promise = service.detectProjectsForOrg('token', 'big-org');

      // Wait for the concurrency cap to be reached. setTimeout(0) drains
      // the full microtask queue and lets pending I/O settle, which is
      // necessary because the folder enumeration does 21 sequential
      // fetches (1 org-level + 20 per-folder) before per-folder project
      // queries can begin.
      const start = Date.now();
      while (Date.now() - start < 2000 && inFlight < 5) {
        await new Promise((r) => setTimeout(r, 5));
      }

      // The cap is 5 — observed peak must not exceed it.
      expect(maxInFlight).toBeGreaterThan(0);
      expect(maxInFlight).toBeLessThanOrEqual(5);

      // Drain — release pending project queries one at a time so the
      // remaining folder workers can pick up the next IDs.
      while (pending.length > 0 || inFlight > 0) {
        const resolver = pending.shift();
        if (resolver) resolver();
        await new Promise((r) => setTimeout(r, 5));
      }
      await promise;

      // After full drain, every folder's project query must have run
      // exactly once. Confirms the concurrency cap didn't prematurely
      // truncate the work.
      const perFolderCalls = fetchMock.mock.calls.filter(
        (c) =>
          typeof c[0] === 'string' &&
          c[0].includes('v1/projects') &&
          c[0].includes('parent.type%3Afolder'),
      ).length;
      expect(perFolderCalls).toBe(FOLDER_COUNT);
    });

    it('isolates per-folder query failures so one bad folder does not blank the rest', async () => {
      // Two folders, the first one's project list throws. The second
      // one should still return its projects.
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('v3/folders') && url.includes('organizations%2F777')) {
          return foldersPage({ folders: ['bad-folder', 'good-folder'] });
        }
        if (url.includes('v3/folders')) return foldersPage({ folders: [] });
        if (url.includes('v1/projects') && url.includes('parent.id%3A777') && !url.includes('parent.type%3Afolder')) {
          return gcpPage({ projects: [] });
        }
        if (url.includes('v1/projects') && url.includes('parent.id%3Abad-folder')) {
          throw new Error('bad folder query exploded');
        }
        if (url.includes('v1/projects') && url.includes('parent.id%3Agood-folder')) {
          return gcpPage({
            projects: [
              { projectId: 'good-proj', name: 'Good', projectNumber: '101' },
            ],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', '777');
      expect(result.map((p) => p.id)).toEqual(['good-proj']);
    });
  });
});

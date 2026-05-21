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

  // ─── detectProjectsForOrg: org direct + folder-nested merge ───────────

  describe('detectProjectsForOrg', () => {
    it('returns the union of direct org children and folder-nested projects', async () => {
      // Two parallel calls expected:
      //   1. parent.id:43356919874  → direct children
      //   2. parent.type:folder    → folder-nested
      // The fix: previously only call (1) ran, so projects under a
      // folder ("propperai-prod", "propperai-demo" in Greg's report)
      // never appeared. After the fix, both run and merge.
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('parent.id%3A43356919874')) {
          // Direct children of the org.
          return gcpPage({
            projects: [
              {
                projectId: 'org-root-1',
                name: 'Root Project',
                projectNumber: '111',
              },
            ],
          });
        }
        if (url.includes('parent.type%3Afolder')) {
          // Folder-nested production projects.
          return gcpPage({
            projects: [
              {
                projectId: 'propperai-prod',
                name: 'Propper Prod',
                projectNumber: '222',
              },
              {
                projectId: 'propperai-demo',
                name: 'Propper Demo',
                projectNumber: '333',
              },
            ],
          });
        }
        throw new Error(`Unexpected fetch URL in test: ${url}`);
      });

      const result = await service.detectProjectsForOrg(
        'token',
        '43356919874',
      );

      const ids = result.map((p) => p.id).sort();
      expect(ids).toEqual(['org-root-1', 'propperai-demo', 'propperai-prod']);
    });

    it('dedupes when the same project appears in both direct and folder lists', async () => {
      // A project legitimately matched by both filters (unusual but
      // possible if GCP's filter semantics overlap in some edge) must
      // not be returned twice.
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('parent.id%3A123')) {
          return gcpPage({ projects: [makeProject('shared')] });
        }
        if (url.includes('parent.type%3Afolder')) {
          return gcpPage({
            projects: [makeProject('shared'), makeProject('unique')],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await service.detectProjectsForOrg('token', '123');

      expect(result.map((p) => p.id)).toEqual(['proj-shared', 'proj-unique']);
    });

    it('fires the two list calls in parallel', async () => {
      const seenUrls: string[] = [];
      let resolveCount = 0;
      const resolvers: Array<() => void> = [];

      fetchMock.mockImplementation((url: string) => {
        seenUrls.push(url);
        return new Promise((resolve) => {
          resolvers.push(() => resolve(gcpPage({ projects: [] })));
        });
      });

      const pending = service.detectProjectsForOrg('token', '999');

      // Yield a microtask so the Promise.all schedules both fetches.
      await Promise.resolve();
      await Promise.resolve();

      expect(seenUrls).toHaveLength(2);
      expect(seenUrls.some((u) => u.includes('parent.id%3A999'))).toBe(true);
      expect(seenUrls.some((u) => u.includes('parent.type%3Afolder'))).toBe(
        true,
      );

      // Resolve both pending fetches so detectProjectsForOrg can complete.
      resolvers.forEach((r) => r());
      resolveCount = resolvers.length;
      await pending;
      expect(resolveCount).toBe(2);
    });

    it('returns empty array when both calls return no projects', async () => {
      fetchMock.mockResolvedValue(gcpPage({ projects: [] }));
      const result = await service.detectProjectsForOrg('token', 'org-no-projects');
      expect(result).toEqual([]);
    });
  });
});

import { describe, expect, test } from 'bun:test';
import { fetchFindingsPages, type FetchImpl } from './client';
import { rejectionOf } from './test-support';
import type { CybeDefendFinding, CybeDefendFindingsPage } from './types';

const finding = (id: string): CybeDefendFinding =>
  ({
    id,
    title: 'Rule',
    description: '',
    remediation: '',
    severity: 'medium',
    status: 'confirmed',
    finding_type: 'sast',
    project_id: 'p',
    project_name: 'p',
    first_detected_at: null,
    last_detected_at: null,
    triaged_at: null,
    resolved_at: null,
    triaged_by: null,
    triaged_by_type: null,
    dismissal_reason: null,
    updated_at: '2026-08-06T08:26:17.000Z',
    url: '',
    details: {},
  }) satisfies CybeDefendFinding;

const ACCESS_TOKEN = 'test-access-token';

/** Serves the given pages in order and records every request it was asked for. */
const fakeServer = (pages: CybeDefendFindingsPage[]) => {
  const requests: string[] = [];
  const headers: Array<Record<string, string> | undefined> = [];
  let call = 0;

  const fetchImpl: FetchImpl = async (url, init) => {
    requests.push(url);
    headers.push(init?.headers);
    const page = pages[call];
    call += 1;
    if (!page) throw new Error(`fake server ran out of pages after ${call} calls`);
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: page }),
      text: async () => '',
    };
  };

  return { fetchImpl, requests, headers, callCount: () => call };
};

/** Serves a single failing response with the given status. */
const failingServer =
  (status: number): FetchImpl =>
  async () => ({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => 'denied',
  });

const options = (fetchImpl: FetchImpl) => ({
  apiBaseUrl: 'https://api-eu.cybedefend.com',
  organizationId: '00000000-0000-4000-8000-000000000000',
  accessToken: ACCESS_TOKEN,
  fetchImpl,
});

describe('fetchFindingsPages: cursor pagination', () => {
  test('walks three pages and returns every finding', async () => {
    const { fetchImpl } = fakeServer([
      {
        findings: [finding('a'), finding('b')],
        next_cursor: 'c1',
        has_more: true,
        next_since: null,
      },
      { findings: [finding('c')], next_cursor: 'c2', has_more: true, next_since: null },
      {
        findings: [finding('d')],
        next_cursor: null,
        has_more: false,
        next_since: '2026-08-06T00:00:00Z',
      },
    ]);

    const result = await fetchFindingsPages(options(fetchImpl));

    expect(result.findings.map((f) => f.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  test('passes the cursor of the previous page to the next request', async () => {
    const { fetchImpl, requests } = fakeServer([
      { findings: [finding('a')], next_cursor: 'cursor-one', has_more: true, next_since: null },
      { findings: [finding('b')], next_cursor: null, has_more: false, next_since: null },
    ]);

    await fetchFindingsPages(options(fetchImpl));

    expect(requests[0]).not.toContain('cursor=');
    expect(requests[1]).toContain('cursor=cursor-one');
  });

  test('stops on has_more false even though the last page still has findings', async () => {
    // A "loop while the page is non-empty" reader would ask for one more page
    // with a null cursor, i.e. restart from page one, and never terminate.
    const { fetchImpl, callCount } = fakeServer([
      { findings: [finding('a')], next_cursor: null, has_more: false, next_since: null },
    ]);

    await fetchFindingsPages(options(fetchImpl));

    expect(callCount()).toBe(1);
  });

  test('keeps walking through an empty page while has_more is true', async () => {
    const { fetchImpl } = fakeServer([
      { findings: [], next_cursor: 'c1', has_more: true, next_since: null },
      { findings: [finding('a')], next_cursor: null, has_more: false, next_since: null },
    ]);

    const result = await fetchFindingsPages(options(fetchImpl));

    expect(result.findings.map((f) => f.id)).toEqual(['a']);
  });
});

describe('fetchFindingsPages: incremental sync marker', () => {
  test('returns the last non-null next_since', async () => {
    const { fetchImpl } = fakeServer([
      {
        findings: [finding('a')],
        next_cursor: 'c1',
        has_more: true,
        next_since: '2026-08-01T00:00:00Z',
      },
      {
        findings: [finding('b')],
        next_cursor: null,
        has_more: false,
        next_since: '2026-08-02T00:00:00Z',
      },
    ]);

    const result = await fetchFindingsPages(options(fetchImpl));

    expect(result.nextSince).toBe('2026-08-02T00:00:00Z');
  });

  test('keeps the previous marker when the last page reports a null next_since', async () => {
    // Overwriting the marker with null re-pulls the whole history next run.
    const { fetchImpl } = fakeServer([
      {
        findings: [finding('a')],
        next_cursor: 'c1',
        has_more: true,
        next_since: '2026-08-01T00:00:00Z',
      },
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    const result = await fetchFindingsPages(options(fetchImpl));

    expect(result.nextSince).toBe('2026-08-01T00:00:00Z');
  });

  test('falls back to the caller marker when no page reports one', async () => {
    const { fetchImpl } = fakeServer([
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    const result = await fetchFindingsPages({
      ...options(fetchImpl),
      updatedSince: '2026-07-01T00:00:00Z',
    });

    expect(result.nextSince).toBe('2026-07-01T00:00:00Z');
  });
});

describe('fetchFindingsPages: request shape', () => {
  test('requests only the open statuses', async () => {
    const { fetchImpl, requests } = fakeServer([
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    await fetchFindingsPages(options(fetchImpl));

    expect(requests[0]).toContain('status=to_verify%2Cconfirmed');
  });

  test('sends updated_since when the caller supplies a marker', async () => {
    const { fetchImpl, requests } = fakeServer([
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    await fetchFindingsPages({ ...options(fetchImpl), updatedSince: '2026-07-01T00:00:00Z' });

    expect(requests[0]).toContain('updated_since=2026-07-01T00%3A00%3A00Z');
  });

  test('omits updated_since entirely on a first sync', async () => {
    const { fetchImpl, requests } = fakeServer([
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    await fetchFindingsPages(options(fetchImpl));

    expect(requests[0]).not.toContain('updated_since');
  });

  test('authenticates with a bearer token', async () => {
    const { fetchImpl, headers } = fakeServer([
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    await fetchFindingsPages(options(fetchImpl));

    expect(headers[0]?.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  test('never puts the token in the query string', async () => {
    const { fetchImpl, requests } = fakeServer([
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    await fetchFindingsPages(options(fetchImpl));

    expect(requests[0]).not.toContain(ACCESS_TOKEN);
  });
});

describe('fetchFindingsPages: untrusted organization id', () => {
  // The id is typed into a connection form and lands in a URL path. The host is
  // pinned by the region so this cannot reach another domain, but an
  // unvalidated value would still walk to other endpoints of the CybeDefend API
  // carrying the caller's bearer token.
  test.each([
    ['path traversal', '../../user/profile'],
    ['a nested path', 'abc/def'],
    ['a query injection', 'abc?admin=true'],
    ['a non-uuid value', 'not-an-organization'],
    ['an empty value', ''],
  ])('refuses %s', async (_label: string, organizationId: string) => {
    const { fetchImpl } = fakeServer([
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    await expect(fetchFindingsPages({ ...options(fetchImpl), organizationId })).rejects.toThrow(
      /organization id/i,
    );
  });

  test('never reaches the network with an invalid organization id', async () => {
    const { fetchImpl, requests } = fakeServer([
      { findings: [], next_cursor: null, has_more: false, next_since: null },
    ]);

    await fetchFindingsPages({
      ...options(fetchImpl),
      organizationId: '../../user/profile',
    }).catch(() => undefined);

    expect(requests).toHaveLength(0);
  });
});

describe('fetchFindingsPages: failures', () => {
  test('separates a credentials problem from a permission problem', async () => {
    await expect(fetchFindingsPages(options(failingServer(401)))).rejects.toThrow(/401/);
    await expect(fetchFindingsPages(options(failingServer(403)))).rejects.toThrow(
      /export_findings/,
    );
  });

  test.each([401, 403, 500])(
    'never leaks the token into the error message for HTTP %i',
    async (status: number) => {
      // This message is logged and stored on the integration result, so the
      // assertion has to read the real message, an asymmetric matcher passed
      // to toThrow() is silently ignored and would pass no matter what.
      const error = await rejectionOf(fetchFindingsPages(options(failingServer(status))));

      expect(error.message).not.toContain(ACCESS_TOKEN);
    },
  );

  test('refuses to restart from page one when the server reports more but sends no cursor', async () => {
    const { fetchImpl } = fakeServer([
      { findings: [finding('a')], next_cursor: null, has_more: true, next_since: null },
    ]);

    await expect(fetchFindingsPages(options(fetchImpl))).rejects.toThrow(/no cursor/i);
  });
});

import type { CybeDefendFinding, CybeDefendFindingsPage } from './types';

/** Live vulnerabilities only. Never empty, the API rejects an empty filter with a 400. */
const OPEN_STATUSES = ['to_verify', 'confirmed'] as const;

/** Maximum allowed by the API. Fewer round trips for the same data. */
const PAGE_SIZE = 100;

/** Backstop against a server that keeps reporting more pages: 100k findings. */
const MAX_PAGES = 1000;

const AUTH_FAILURE_HINT =
  'Check the region, the organization ID, and that the personal access token is still valid.';

const PERMISSION_FAILURE_HINT =
  'The account behind the token needs the export_findings permission on this organization.';

/** Minimal shape of a fetch response, so tests can serve pages without a socket. */
export interface HttpResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

export interface RequestInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export type FetchImpl = (url: string, init?: RequestInitLike) => Promise<HttpResponse>;

export interface FetchFindingsPagesOptions {
  apiBaseUrl: string;
  organizationId: string;
  accessToken: string;
  /** Marker from the previous sync. Omit for a first, full pull. */
  updatedSince?: string;
  fetchImpl?: FetchImpl;
}

export interface FetchFindingsPagesResult {
  findings: CybeDefendFinding[];
  /** Marker to persist for the next incremental sync. */
  nextSince: string | null;
}

/**
 * The organization id is operator-supplied and lands in a URL path segment.
 *
 * The host is pinned by the region, so a bad value cannot reach another domain,
 * but an unvalidated one would still walk to other endpoints of the CybeDefend
 * API while carrying the caller's bearer token. Anything that is not a UUID is
 * refused before a request is made.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const assertOrganizationId = (organizationId: string): void => {
  if (!UUID_PATTERN.test(organizationId)) {
    throw new Error('CybeDefend organization ID must be a UUID.');
  }
};

const buildUrl = ({
  apiBaseUrl,
  organizationId,
  updatedSince,
  cursor,
}: {
  apiBaseUrl: string;
  organizationId: string;
  updatedSince?: string;
  cursor: string | null;
}): string => {
  const params = new URLSearchParams({
    status: OPEN_STATUSES.join(','),
    page_size: String(PAGE_SIZE),
  });

  if (updatedSince) params.set('updated_since', updatedSince);
  if (cursor) params.set('cursor', cursor);

  // Encoded as well as validated upstream: defence in depth, since this value
  // originates from a settings form.
  return `${apiBaseUrl}/organization/${encodeURIComponent(organizationId)}/findings?${params.toString()}`;
};

/** Hand-narrowed rather than zod: `details` is free-form and a schema would strip it. */
const readPage = (payload: unknown): CybeDefendFindingsPage => {
  const envelope = payload as { data?: unknown };
  const page = (envelope?.data ?? payload) as Partial<CybeDefendFindingsPage>;

  if (!Array.isArray(page?.findings) || typeof page?.has_more !== 'boolean') {
    throw new Error('Unexpected response from the CybeDefend findings export.');
  }

  return {
    findings: page.findings,
    next_cursor: page.next_cursor ?? null,
    has_more: page.has_more,
    next_since: page.next_since ?? null,
  };
};

const describeFailure = (status: number): string => {
  if (status === 401) return `CybeDefend rejected the credentials (401). ${AUTH_FAILURE_HINT}`;
  if (status === 403) return `CybeDefend denied the request (403). ${PERMISSION_FAILURE_HINT}`;
  return `CybeDefend findings export failed with HTTP ${status}.`;
};

/**
 * Pulls every page for an organization. Termination is driven by `has_more`,
 * never by an empty page: stopping on emptiness would re-request with a null
 * cursor, restarting at page one forever.
 */
export const fetchFindingsPages = async ({
  apiBaseUrl,
  organizationId,
  accessToken,
  updatedSince,
  fetchImpl = globalThis.fetch as unknown as FetchImpl,
}: FetchFindingsPagesOptions): Promise<FetchFindingsPagesResult> => {
  assertOrganizationId(organizationId);

  const findings: CybeDefendFinding[] = [];
  let cursor: string | null = null;
  // A page that reports no marker means "keep the one you have", not "start over".
  let nextSince: string | null = updatedSince ?? null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = buildUrl({ apiBaseUrl, organizationId, updatedSince, cursor });

    const response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(describeFailure(response.status));
    }

    const current = readPage(await response.json());
    findings.push(...current.findings);
    if (current.next_since) nextSince = current.next_since;

    if (!current.has_more) return { findings, nextSince };

    if (!current.next_cursor) {
      throw new Error(
        'CybeDefend reported more findings but returned no cursor; refusing to restart from the first page.',
      );
    }

    cursor = current.next_cursor;
  }

  throw new Error(`CybeDefend findings export exceeded ${MAX_PAGES} pages; aborting.`);
};

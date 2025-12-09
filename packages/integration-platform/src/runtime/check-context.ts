import type {
  CheckContext,
  CheckFindingResult,
  CheckPassingResult,
  CheckVariableValues,
  IntegrationManifest,
} from '../types';

export interface CheckContextOptions {
  manifest: IntegrationManifest;
  /** Access token for OAuth integrations. Optional for custom auth types (e.g., AWS IAM). */
  accessToken?: string;
  credentials: Record<string, string>;
  variables?: CheckVariableValues;
  connectionId: string;
  organizationId: string;
  /** Connection metadata (e.g., OAuth team/user info from token response) */
  metadata?: Record<string, unknown>;
  logger?: {
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, data?: Record<string, unknown>) => void;
  };
  stateStorage?: {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T) => Promise<void>;
  };
  onTokenRefresh?: () => Promise<string | null>;
}

export interface CheckResultLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface CheckResult {
  findings: Array<CheckFindingResult & { status: 'open' }>;
  passingResults: Array<CheckPassingResult & { collectedAt: Date }>;
  logs: CheckResultLog[];
  summary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_PAGES_DEFAULT = 100;
const PER_PAGE_DEFAULT = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function parseLinkHeader(header: string | null): { next?: string } {
  if (!header) return {};
  const links: { next?: string } = {};
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] === 'next') {
      links.next = match[1];
    }
  }
  return links;
}

export function createCheckContext(options: CheckContextOptions): {
  ctx: CheckContext;
  getResults: () => CheckResult;
} {
  const {
    manifest,
    accessToken: initialAccessToken,
    credentials,
    variables = {},
    connectionId,
    organizationId,
    metadata,
    logger,
    stateStorage,
    onTokenRefresh,
  } = options;

  let currentAccessToken = initialAccessToken ?? '';
  const findings: CheckResult['findings'] = [];
  const passingResults: CheckResult['passingResults'] = [];
  const logs: CheckResult['logs'] = [];
  let totalChecked = 0;
  const baseUrl = manifest.baseUrl || '';
  const defaultHeaders = manifest.defaultHeaders || {};

  const log = {
    info: (message: string, data?: Record<string, unknown>) => {
      logs.push({ level: 'info', message, data, timestamp: new Date() });
      logger?.info(message, data);
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      logs.push({ level: 'warn', message, data, timestamp: new Date() });
      logger?.warn(message, data);
    },
    error: (message: string, data?: Record<string, unknown>) => {
      logs.push({ level: 'error', message, data, timestamp: new Date() });
      logger?.error(message, data);
    },
  };

  const inMemoryState = new Map<string, unknown>();
  const state = stateStorage ?? {
    get: async <T>(key: string): Promise<T | null> => (inMemoryState.get(key) as T) ?? null,
    set: async <T>(key: string, value: T): Promise<void> => {
      inMemoryState.set(key, value);
    },
  };

  const buildHeaders = (extra?: Record<string, string>): Record<string, string> => {
    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...extra,
    };

    // OAuth: Add Bearer token
    if (manifest.auth.type === 'oauth2' && currentAccessToken) {
      headers['Authorization'] = `Bearer ${currentAccessToken}`;
    }

    // API Key: Add to header if configured
    if (manifest.auth.type === 'api_key' && manifest.auth.config.in === 'header') {
      const apiKey = credentials[manifest.auth.config.name] || credentials.api_key || '';
      const value = manifest.auth.config.prefix
        ? `${manifest.auth.config.prefix}${apiKey}`
        : apiKey;
      headers[manifest.auth.config.name] = value;
    }

    // Basic Auth: Encode username:password
    if (manifest.auth.type === 'basic') {
      const username = credentials[manifest.auth.config.usernameField || 'username'] || '';
      const password = credentials[manifest.auth.config.passwordField || 'password'] || '';
      const encoded = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }

    return headers;
  };

  async function withRetry(requestFn: () => Promise<Response>, attempt = 0): Promise<Response> {
    const response = await requestFn();

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get('Retry-After');
      let delayMs: number;
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        delayMs = isNaN(seconds)
          ? Math.max(0, new Date(retryAfter).getTime() - Date.now())
          : seconds * 1000;
      } else {
        delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      }
      log.warn(`Rate limited, retry in ${delayMs}ms`, { attempt: attempt + 1 });
      await sleep(delayMs);
      return withRetry(requestFn, attempt + 1);
    }

    if (response.status >= 500 && attempt < MAX_RETRIES) {
      const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      log.warn(`Server error ${response.status}, retry in ${delayMs}ms`, { attempt: attempt + 1 });
      await sleep(delayMs);
      return withRetry(requestFn, attempt + 1);
    }

    return response;
  }

  async function executeRequest<T>(requestFn: () => Promise<Response>): Promise<T> {
    let response = await withRetry(requestFn);

    if (response.status === 401 && onTokenRefresh) {
      log.info('Token expired, refreshing...');
      const newToken = await onTokenRefresh();
      if (newToken) {
        currentAccessToken = newToken;
        response = await withRetry(requestFn);
      } else {
        log.error('Token refresh failed');
      }
    }

    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (err as Error & { status: number }).status = response.status;
      throw err;
    }

    return response.json();
  }

  function buildUrl(path: string, base?: string, params?: Record<string, string>): URL {
    const url = new URL(path, base || baseUrl);

    // Add any provided query params
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    // API Key in query param
    if (manifest.auth.type === 'api_key' && manifest.auth.config.in === 'query') {
      const apiKey = credentials[manifest.auth.config.name] || credentials.api_key || '';
      const value = manifest.auth.config.prefix
        ? `${manifest.auth.config.prefix}${apiKey}`
        : apiKey;
      url.searchParams.set(manifest.auth.config.name, value);
    }

    return url;
  }

  async function httpGet<T>(
    path: string,
    opts?: { baseUrl?: string; headers?: Record<string, string>; params?: Record<string, string> },
  ): Promise<T> {
    const url = buildUrl(path, opts?.baseUrl, opts?.params);
    return executeRequest<T>(() =>
      fetch(url.toString(), { method: 'GET', headers: buildHeaders(opts?.headers) }),
    );
  }

  async function httpPost<T>(
    path: string,
    body?: unknown,
    opts?: { baseUrl?: string; headers?: Record<string, string> },
  ): Promise<T> {
    const url = buildUrl(path, opts?.baseUrl);
    return executeRequest<T>(() =>
      fetch(url.toString(), {
        method: 'POST',
        headers: { ...buildHeaders(opts?.headers), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  }

  async function httpPut<T>(
    path: string,
    body?: unknown,
    opts?: { baseUrl?: string; headers?: Record<string, string> },
  ): Promise<T> {
    const url = buildUrl(path, opts?.baseUrl);
    return executeRequest<T>(() =>
      fetch(url.toString(), {
        method: 'PUT',
        headers: { ...buildHeaders(opts?.headers), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  }

  async function httpPatch<T>(
    path: string,
    body?: unknown,
    opts?: { baseUrl?: string; headers?: Record<string, string> },
  ): Promise<T> {
    const url = buildUrl(path, opts?.baseUrl);
    return executeRequest<T>(() =>
      fetch(url.toString(), {
        method: 'PATCH',
        headers: { ...buildHeaders(opts?.headers), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  }

  async function httpDelete<T>(
    path: string,
    opts?: { baseUrl?: string; headers?: Record<string, string> },
  ): Promise<T> {
    const url = buildUrl(path, opts?.baseUrl);
    return executeRequest<T>(() =>
      fetch(url.toString(), { method: 'DELETE', headers: buildHeaders(opts?.headers) }),
    );
  }

  async function graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
    opts?: { endpoint?: string; headers?: Record<string, string> },
  ): Promise<T> {
    const endpoint = opts?.endpoint || `${baseUrl}/graphql`;
    const response = await executeRequest<{ data?: T; errors?: Array<{ message: string }> }>(() =>
      fetch(endpoint, {
        method: 'POST',
        headers: { ...buildHeaders(opts?.headers), 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      }),
    );

    if (response.errors?.length) {
      throw new Error(`GraphQL: ${response.errors.map((e) => e.message).join(', ')}`);
    }
    if (!response.data) {
      throw new Error('GraphQL response missing data');
    }
    return response.data;
  }

  async function fetchAllPages<T>(
    path: string,
    opts?: {
      baseUrl?: string;
      perPage?: number;
      maxPages?: number;
      pageParam?: string;
      perPageParam?: string;
    },
  ): Promise<T[]> {
    const perPage = opts?.perPage ?? PER_PAGE_DEFAULT;
    const maxPages = opts?.maxPages ?? MAX_PAGES_DEFAULT;
    const pageParam = opts?.pageParam ?? 'page';
    const perPageParam = opts?.perPageParam ?? 'per_page';
    const results: T[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const url = buildUrl(path, opts?.baseUrl);
      url.searchParams.set(pageParam, String(page));
      url.searchParams.set(perPageParam, String(perPage));

      const items = await executeRequest<T[]>(() =>
        fetch(url.toString(), { method: 'GET', headers: buildHeaders() }),
      );

      if (!Array.isArray(items) || items.length === 0) break;
      results.push(...items);
      if (items.length < perPage) break;
    }

    return results;
  }

  async function fetchWithCursor<T>(
    path: string,
    opts?: {
      baseUrl?: string;
      cursorParam?: string;
      cursorPath?: string;
      dataPath?: string;
      params?: Record<string, string>;
      maxPages?: number;
    },
  ): Promise<T[]> {
    const cursorParam = opts?.cursorParam ?? 'cursor';
    const cursorPath = opts?.cursorPath ?? 'next_cursor';
    const dataPath = opts?.dataPath ?? 'data';
    const maxPages = opts?.maxPages ?? MAX_PAGES_DEFAULT;
    const results: T[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < maxPages; page++) {
      const url = buildUrl(path, opts?.baseUrl, opts?.params);
      if (cursor) url.searchParams.set(cursorParam, cursor);

      const response = await executeRequest<Record<string, unknown>>(() =>
        fetch(url.toString(), { method: 'GET', headers: buildHeaders() }),
      );

      const data = getNestedValue(response, dataPath);
      if (!Array.isArray(data) || data.length === 0) break;

      results.push(...(data as T[]));

      const nextCursor = getNestedValue(response, cursorPath);
      if (typeof nextCursor !== 'string' || !nextCursor) break;
      cursor = nextCursor;
    }

    return results;
  }

  async function fetchWithLinkHeader<T>(
    path: string,
    opts?: { baseUrl?: string; params?: Record<string, string>; maxPages?: number },
  ): Promise<T[]> {
    const maxPages = opts?.maxPages ?? MAX_PAGES_DEFAULT;
    const results: T[] = [];
    let nextUrl: string | null = buildUrl(path, opts?.baseUrl, opts?.params).toString();

    for (let page = 0; page < maxPages && nextUrl; page++) {
      let response = await withRetry(() =>
        fetch(nextUrl!, { method: 'GET', headers: buildHeaders() }),
      );

      if (response.status === 401 && onTokenRefresh) {
        const newToken = await onTokenRefresh();
        if (newToken) {
          currentAccessToken = newToken;
          response = await withRetry(() =>
            fetch(nextUrl!, { method: 'GET', headers: buildHeaders() }),
          );
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const items: T[] = await response.json();
      if (!Array.isArray(items) || items.length === 0) break;

      results.push(...items);
      nextUrl = parseLinkHeader(response.headers.get('Link')).next ?? null;
    }

    return results;
  }

  const ctx: CheckContext = {
    get accessToken() {
      return currentAccessToken;
    },
    credentials,
    variables,
    connectionId,
    organizationId,
    metadata,
    log: log.info,
    warn: log.warn,
    error: log.error,

    pass(result: CheckPassingResult) {
      totalChecked++;
      passingResults.push({ ...result, collectedAt: new Date() });
      log.info(`PASS: ${result.title}`, {
        resourceType: result.resourceType,
        resourceId: result.resourceId,
      });
    },

    fail(finding: CheckFindingResult) {
      totalChecked++;
      findings.push({ ...finding, status: 'open' });
      log.info(`FAIL: ${finding.title}`, {
        resourceType: finding.resourceType,
        resourceId: finding.resourceId,
        severity: finding.severity,
      });
    },

    addFinding(finding) {
      totalChecked++;
      findings.push({
        title: finding.title,
        description: finding.description || '',
        resourceType: finding.resourceType,
        resourceId: finding.resourceId,
        severity: finding.severity,
        remediation: finding.remediation || '',
        evidence: finding.rawPayload,
        status: 'open',
      });
    },

    addPassingResult(result) {
      totalChecked++;
      passingResults.push({
        title: result.title,
        description: result.description || '',
        resourceType: result.resourceType,
        resourceId: result.resourceId,
        evidence: result.evidence || {},
        collectedAt: new Date(),
      });
    },

    fetch: httpGet,
    post: httpPost,
    put: httpPut,
    patch: httpPatch,
    delete: httpDelete,
    graphql,
    fetchAllPages,
    fetchWithCursor,
    fetchWithLinkHeader,
    getState: state.get,
    setState: state.set,
  };

  return {
    ctx,
    getResults: () => ({
      findings,
      passingResults,
      logs,
      summary: { totalChecked, passed: passingResults.length, failed: findings.length },
    }),
  };
}

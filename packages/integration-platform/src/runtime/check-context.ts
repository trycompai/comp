import type {
  CheckContext,
  CheckFindingResult,
  CheckPassingResult,
  CheckVariableValues,
  IntegrationManifest,
} from '../types';

// ============================================================================
// Check Context Factory
// ============================================================================

export interface CheckContextOptions {
  /** The integration manifest */
  manifest: IntegrationManifest;
  /** OAuth access token */
  accessToken: string;
  /** All credentials as key-value */
  credentials: Record<string, string>;
  /** User-configured variables */
  variables?: CheckVariableValues;
  /** Connection ID */
  connectionId: string;
  /** Organization ID */
  organizationId: string;
  /** Logger implementation */
  logger?: {
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, data?: Record<string, unknown>) => void;
  };
  /** State storage implementation */
  stateStorage?: {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T) => Promise<void>;
  };
}

export interface CheckResultLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface CheckResult {
  /** Issues found during the check */
  findings: Array<CheckFindingResult & { status: 'open' }>;
  /** Resources that passed with evidence */
  passingResults: Array<CheckPassingResult & { collectedAt: Date }>;
  /** Execution log for audit trail */
  logs: CheckResultLog[];
  /** Summary stats */
  summary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

/**
 * Creates a CheckContext for running integration checks.
 * Returns the context and a function to get the results.
 */
export function createCheckContext(options: CheckContextOptions): {
  ctx: CheckContext;
  getResults: () => CheckResult;
} {
  const {
    manifest,
    accessToken,
    credentials,
    variables = {},
    connectionId,
    organizationId,
    logger,
    stateStorage,
  } = options;

  const findings: CheckResult['findings'] = [];
  const passingResults: CheckResult['passingResults'] = [];
  const logs: CheckResult['logs'] = [];
  let totalChecked = 0;

  const baseUrl = manifest.baseUrl || '';
  const defaultHeaders = manifest.defaultHeaders || {};

  // Create a logger that always captures logs for the result,
  // and optionally delegates to an external logger
  const log = {
    info: (message: string, data?: Record<string, unknown>) => {
      logs.push({ level: 'info', message, data, timestamp: new Date() });
      if (logger) {
        logger.info(message, data);
      } else {
        console.log(`[INFO] ${message}`, data || '');
      }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      logs.push({ level: 'warn', message, data, timestamp: new Date() });
      if (logger) {
        logger.warn(message, data);
      } else {
        console.warn(`[WARN] ${message}`, data || '');
      }
    },
    error: (message: string, data?: Record<string, unknown>) => {
      logs.push({ level: 'error', message, data, timestamp: new Date() });
      if (logger) {
        logger.error(message, data);
      } else {
        console.error(`[ERROR] ${message}`, data || '');
      }
    },
  };

  // Default state storage (in-memory, for testing)
  const inMemoryState = new Map<string, unknown>();
  const defaultStateStorage = {
    get: async <T>(key: string): Promise<T | null> => {
      return (inMemoryState.get(key) as T) || null;
    },
    set: async <T>(key: string, value: T): Promise<void> => {
      inMemoryState.set(key, value);
    },
  };

  const state = stateStorage || defaultStateStorage;

  // Build headers for requests
  const buildHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
    return {
      ...defaultHeaders,
      Authorization: `Bearer ${accessToken}`,
      ...extraHeaders,
    };
  };

  // Fetch helper
  const fetchHelper = async <T = unknown>(
    path: string,
    options?: {
      baseUrl?: string;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    },
  ): Promise<T> => {
    const url = new URL(path, options?.baseUrl || baseUrl);

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(options?.headers),
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as Error & { status: number }).status = response.status;
      throw error;
    }

    return response.json();
  };

  // Post helper
  const postHelper = async <T = unknown>(
    path: string,
    body?: unknown,
    options?: {
      baseUrl?: string;
      headers?: Record<string, string>;
    },
  ): Promise<T> => {
    const url = new URL(path, options?.baseUrl || baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...buildHeaders(options?.headers),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as Error & { status: number }).status = response.status;
      throw error;
    }

    return response.json();
  };

  // Pagination helper
  const fetchAllPages = async <T = unknown>(
    path: string,
    options?: {
      baseUrl?: string;
      perPage?: number;
      maxPages?: number;
      pageParam?: string;
      perPageParam?: string;
    },
  ): Promise<T[]> => {
    const perPage = options?.perPage || 100;
    const maxPages = options?.maxPages || 100;
    const pageParam = options?.pageParam || 'page';
    const perPageParam = options?.perPageParam || 'per_page';

    const allItems: T[] = [];
    let page = 1;

    while (page <= maxPages) {
      const url = new URL(path, options?.baseUrl || baseUrl);
      url.searchParams.set(pageParam, String(page));
      url.searchParams.set(perPageParam, String(perPage));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: buildHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const items: T[] = await response.json();

      if (!Array.isArray(items) || items.length === 0) {
        break;
      }

      allItems.push(...items);

      if (items.length < perPage) {
        break;
      }

      page++;
    }

    return allItems;
  };

  const ctx: CheckContext = {
    accessToken,
    credentials,
    variables,
    connectionId,
    organizationId,

    // Logging
    log: (message, data) => log.info(message, data),
    warn: (message, data) => log.warn(message, data),
    error: (message, data) => log.error(message, data),

    // New pass/fail methods (preferred)
    pass: (result: CheckPassingResult) => {
      totalChecked++;
      passingResults.push({
        ...result,
        collectedAt: new Date(),
      });
      log.info(`✓ PASS: ${result.title}`, {
        resourceType: result.resourceType,
        resourceId: result.resourceId,
      });
    },

    fail: (finding: CheckFindingResult) => {
      totalChecked++;
      findings.push({
        ...finding,
        status: 'open',
      });
      log.info(`✗ FAIL: ${finding.title}`, {
        resourceType: finding.resourceType,
        resourceId: finding.resourceId,
        severity: finding.severity,
      });
    },

    // Legacy aliases (deprecated)
    addFinding: (finding) => {
      totalChecked++;
      findings.push({
        title: finding.title,
        description: finding.description || '',
        resourceType: finding.resourceType,
        resourceId: finding.resourceId,
        severity: finding.severity,
        remediation: finding.remediation || 'No remediation provided',
        evidence: finding.rawPayload,
        status: 'open',
      });
    },

    addPassingResult: (result) => {
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

    // HTTP helpers
    fetch: fetchHelper,
    post: postHelper,
    fetchAllPages,

    // State
    getState: state.get,
    setState: state.set,
  };

  const getResults = (): CheckResult => ({
    findings,
    passingResults,
    logs,
    summary: {
      totalChecked,
      passed: passingResults.length,
      failed: findings.length,
    },
  });

  return { ctx, getResults };
}

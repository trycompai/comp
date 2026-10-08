import type { CheckContext, CheckVariableValues } from '../../../types';

export interface FakeRun {
  ctx: CheckContext;
  passed: string[];
  failed: string[];
  calls: Array<{ path: string; baseUrl?: string; params?: Record<string, string> }>;
}

/**
 * Builds a CheckContext whose fetchWithCursor serves canned list data per path.
 * A route value that is an Error is thrown instead, to exercise failure handling.
 */
export function fakeContext({
  routes,
  variables,
  credentials = { api_key: 'maple_ak_test' },
}: {
  routes: Record<string, unknown[] | Error>;
  variables?: CheckVariableValues;
  credentials?: Record<string, string>;
}): FakeRun {
  const passed: string[] = [];
  const failed: string[] = [];
  const calls: FakeRun['calls'] = [];

  const ctx = {
    accessToken: '',
    credentials,
    variables,
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: () => {},
    pass: (result: { resourceId: string }) => {
      passed.push(result.resourceId);
    },
    fail: (result: { resourceId: string }) => {
      failed.push(result.resourceId);
    },
    fetchWithCursor: (async <T>(
      path: string,
      options?: { baseUrl?: string; params?: Record<string, string> },
    ): Promise<T[]> => {
      calls.push({ path, baseUrl: options?.baseUrl, params: options?.params });
      const route = routes[path];
      if (route === undefined) throw new Error(`Unexpected fetch: ${path}`);
      if (route instanceof Error) throw route;
      return route as T[];
    }) as CheckContext['fetchWithCursor'],
  } as unknown as CheckContext;

  return { ctx, passed, failed, calls };
}

export const httpError = (status: number): Error =>
  Object.assign(new Error(`HTTP ${status}`), { status });

export const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString();

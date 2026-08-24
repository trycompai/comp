import type { CheckContext, CheckFindingResult, CheckPassingResult } from '../../../types';

export interface MockFetchCall {
  method: 'GET' | 'POST';
  path: string;
}

export function makeBackupCtx(options: {
  credentials?: Record<string, string | string[]>;
  fetchImpl: (path: string, init?: { method?: string }) => Promise<unknown>;
}): {
  ctx: CheckContext;
  passed: CheckPassingResult[];
  failed: CheckFindingResult[];
  calls: MockFetchCall[];
} {
  const passed: CheckPassingResult[] = [];
  const failed: CheckFindingResult[] = [];
  const calls: MockFetchCall[] = [];

  const ctx: CheckContext = {
    accessToken: '',
    credentials: options.credentials ?? {
      username: 'api-user',
      password: 'secret',
      baseUrl: 'https://api.mspbackups.com',
    },
    variables: {},
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: () => {},
    warn: () => {},
    error: () => {},
    pass: (result) => {
      passed.push(result);
    },
    fail: (result) => {
      failed.push(result);
    },
    fetch: (async (path: string) => {
      calls.push({ method: 'GET', path });
      return options.fetchImpl(path, { method: 'GET' });
    }) as CheckContext['fetch'],
    post: (async (path: string) => {
      calls.push({ method: 'POST', path });
      return options.fetchImpl(path, { method: 'POST' });
    }) as CheckContext['post'],
    fetchAllPages: (async () => []) as CheckContext['fetchAllPages'],
    graphql: (async () => ({})) as CheckContext['graphql'],
  } as CheckContext;

  return { ctx, passed, failed, calls };
}

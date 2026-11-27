import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  permission: vi.fn(),
  member: vi.fn(),
  automation: vi.fn(),
  fetch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/utils/auth', () => ({
  auth: { api: { getSession: mocks.session, hasPermission: mocks.permission } },
}));
vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.member },
    evidenceAutomation: { findUnique: mocks.automation },
  },
}));
vi.mock('@/lib/api-server', () => ({ serverApi: { post: mocks.post } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

import { executeAutomationScript } from './automation-execution-actions';
import { publishAutomation } from './automation-version-actions';

const scope = { orgId: 'org_demo', taskId: 'tsk_demo', automationId: 'aut_demo' };
const approvedCriteria = 'Pass only with complete evidence and every required setting verified.';
const generatedCriteria = 'Evidence collected without errors.';
let persistedCriteria: string | null;

const operations = [
  ['execute', () => executeAutomationScript(scope)],
  ['publish', () => publishAutomation(scope.orgId, scope.taskId, scope.automationId)],
] as const;

function enterpriseResponse(url: string) {
  const data = url.endsWith('/publish')
    ? { success: true, version: 1, scriptKey: 'org_demo/tsk_demo/aut_demo.v1.js' }
    : { runId: 'run_demo' };
  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}

beforeEach(() => {
  vi.resetAllMocks();
  persistedCriteria = approvedCriteria;
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubEnv('ENTERPRISE_API_SECRET', 'synthetic-test-secret');
  vi.stubEnv('NEXT_PUBLIC_ENTERPRISE_API_URL', 'https://enterprise.example');
  mocks.session.mockResolvedValue({
    session: { activeOrganizationId: scope.orgId },
    user: { id: 'user_demo' },
  });
  mocks.permission.mockResolvedValue({ success: true });
  mocks.member.mockResolvedValue({ id: 'mem_demo' });
  mocks.automation.mockImplementation(async () => ({
    taskId: scope.taskId,
    task: { organizationId: scope.orgId },
    evaluationCriteria: persistedCriteria,
  }));
  mocks.fetch.mockImplementation(async (url: string) => enterpriseResponse(url));
  mocks.post.mockResolvedValue({ status: 201, data: { success: true, version: { version: 1 } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe.each(operations)('%s evaluation criteria integrity', (_name, operation) => {
  it('retains successful operations when existing criteria stay exact', async () => {
    expect((await operation()).success).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(persistedCriteria).toBe(approvedCriteria);
    expect(mocks.automation).toHaveBeenCalledWith({
      where: {
        id: scope.automationId,
        task: { organizationId: scope.orgId },
        taskId: scope.taskId,
      },
      select: {
        taskId: true,
        task: { select: { organizationId: true } },
        evaluationCriteria: true,
      },
    });
  });

  it.each([generatedCriteria, '', null])(
    'does not report success when enterprise replaces or clears saved criteria: %s',
    async (replacement) => {
      mocks.fetch.mockImplementation(async (url: string) => {
        persistedCriteria = replacement;
        return enterpriseResponse(url);
      });

      const result = await operation();
      expect(result).toEqual({
        success: false,
        error:
          'Evaluation criteria changed during the request. Review the saved criteria and retry.',
      });
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
      expect(mocks.automation).toHaveBeenCalledTimes(2);
      expect(mocks.post).not.toHaveBeenCalled();
      expect(persistedCriteria).toBe(replacement);
      expect(JSON.stringify(result)).not.toContain(approvedCriteria);
      expect(JSON.stringify(result)).not.toContain(generatedCriteria);
    },
  );

  it('does not overwrite a concurrent human criteria change', async () => {
    const revisedCriteria = 'Require independent reviewer confirmation before passing.';
    mocks.fetch.mockImplementation(async (url: string) => {
      persistedCriteria = revisedCriteria;
      return enterpriseResponse(url);
    });

    expect((await operation()).success).toBe(false);
    expect(persistedCriteria).toBe(revisedCriteria);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each([null, ''])('allows first criteria initialization from %s', async (initial) => {
    persistedCriteria = initial;
    mocks.fetch.mockImplementation(async (url: string) => {
      persistedCriteria = generatedCriteria;
      return enterpriseResponse(url);
    });

    expect((await operation()).success).toBe(true);
    expect(persistedCriteria).toBe(generatedCriteria);
  });

  it('fails closed when the postflight criteria read is unavailable', async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      mocks.automation.mockRejectedValue(new Error('Synthetic read failure'));
      return enterpriseResponse(url);
    });

    expect((await operation()).success).toBe(false);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('keeps enterprise failure without inventing successful persistence', async () => {
    mocks.fetch.mockResolvedValue(new Response('{}', { status: 500 }));

    expect(await operation()).toEqual({ success: false, error: 'API request failed: 500' });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('denies read-only callers before contacting enterprise', async () => {
    mocks.permission.mockResolvedValue({ success: false });

    expect(await operation()).toEqual({ success: false, error: 'Unauthorized' });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  permission: vi.fn(),
  member: vi.fn(),
  task: vi.fn(),
  automation: vi.fn(),
  fetch: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('@/utils/auth', () => ({
  auth: {
    api: {
      getSession: mocks.session,
      hasPermission: mocks.permission,
    },
  },
}));
vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.member },
    task: { findUnique: mocks.task },
    evidenceAutomation: { findUnique: mocks.automation },
  },
}));
vi.mock('@/lib/api-server', () => ({ serverApi: { post: mocks.post, patch: mocks.patch } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));

import { issueRunReceipt } from './automation-run-receipt';
import {
  analyzeAutomationWorkflow,
  executeAutomationScript,
  getAutomationRunStatus,
  getAutomationScript,
  listAutomationScripts,
  loadChatHistory,
  publishAutomation,
  restoreVersion,
  saveChatHistory,
  toggleAutomationEnabled,
  updateEvaluationCriteria,
  uploadAutomationScript,
} from './task-automation-actions';

const scope = { orgId: 'org_1', taskId: 'tsk_1', automationId: 'aut_1' };
const runScope = {
  organizationId: 'org_1',
  taskId: 'tsk_1',
  automationId: 'aut_1',
  runId: 'run_1',
};
const upload = { orgId: 'org_1', taskId: 'tsk_1', content: 'code' };
const mutations = [
  ['upload', () => uploadAutomationScript(upload)],
  ['execute', () => executeAutomationScript(scope)],
  ['publish', () => publishAutomation('org_1', 'tsk_1', 'aut_1')],
  ['restore', () => restoreVersion('org_1', 'tsk_1', 'aut_1', 1)],
  ['save chat', () => saveChatHistory('aut_1', [])],
  ['analyze', () => analyzeAutomationWorkflow('code')],
  ['evaluation', () => updateEvaluationCriteria('tsk_1', 'aut_1', 'criteria')],
  ['toggle', () => toggleAutomationEnabled('tsk_1', 'aut_1', true)],
] as const;
const reads = [
  ['get script', () => getAutomationScript('org_1/tsk_1/aut_1.draft.js')],
  ['list scripts', () => listAutomationScripts('org_1')],
  ['load chat', () => loadChatHistory('aut_1')],
  ['run status', () => getAutomationRunStatus(issueRunReceipt(runScope))],
] as const;
const actions = [...mutations, ...reads];

function enterpriseResponse(data: unknown = {}) {
  mocks.fetch.mockImplementation(
    async () => new Response(JSON.stringify({ success: true, data }), { status: 200 }),
  );
}
function expectNoSideEffects() {
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.post).not.toHaveBeenCalled();
  expect(mocks.patch).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubEnv('ENTERPRISE_API_SECRET', 'test-secret');
  vi.stubEnv('NEXT_PUBLIC_ENTERPRISE_API_URL', 'https://enterprise.example');
  mocks.session.mockResolvedValue({
    session: { activeOrganizationId: 'org_1' },
    user: { id: 'user_1' },
  });
  mocks.permission.mockResolvedValue({ success: true });
  mocks.member.mockResolvedValue({ id: 'mem_1' });
  mocks.task.mockResolvedValue({ organizationId: 'org_1' });
  mocks.automation.mockResolvedValue({ taskId: 'tsk_1', task: { organizationId: 'org_1' } });
  mocks.post.mockResolvedValue({ status: 201, data: { success: true, version: { version: 1 } } });
  mocks.patch.mockResolvedValue({ status: 200, data: {} });
  enterpriseResponse();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('authorization before privileged requests', () => {
  it.each(mutations)('denies read-only auditor mutation: %s', async (_name, action) => {
    mocks.permission.mockImplementation(async ({ body }) => ({
      success: body.permission.task[0] === 'read',
    }));
    expect(await action()).toEqual({ success: false, error: 'Unauthorized' });
    expectNoSideEffects();
  });
  it.each(actions)('denies portal-only employee: %s', async (_name, action) => {
    mocks.permission.mockResolvedValue({ success: false });
    expect(await action()).toEqual({ success: false, error: 'Unauthorized' });
    expectNoSideEffects();
  });
  it.each(actions)(
    'denies removed, inactive or deactivated membership: %s',
    async (_name, action) => {
      mocks.member.mockResolvedValue(null);
      expect(await action()).toEqual({ success: false, error: 'Unauthorized' });
      expect(mocks.member).toHaveBeenCalledWith({
        where: { organizationId: 'org_1', userId: 'user_1', isActive: true, deactivated: false },
        select: { id: true },
      });
      expect(mocks.permission).not.toHaveBeenCalled();
      expectNoSideEffects();
    },
  );
  it.each([null, { session: { activeOrganizationId: null }, user: { id: 'user_1' } }])(
    'denies absent session or active organization',
    async (session) => {
      mocks.session.mockResolvedValue(session);
      for (const [, action] of actions) expect((await action()).success).toBe(false);
      expectNoSideEffects();
    },
  );
  it('fails closed when API permission resolution fails', async () => {
    mocks.permission.mockRejectedValue(new Error('API unavailable'));
    expect((await executeAutomationScript(scope)).success).toBe(false);
    expectNoSideEffects();
  });
  it.each(reads)('allows authorized reads: %s', async (name, action) => {
    if (name === 'load chat') enterpriseResponse({ messages: [], total: 0, hasMore: false });
    expect((await action()).success).toBe(true);
    expect(mocks.permission).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { organizationId: 'org_1', permission: { task: ['read'] } },
      }),
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('task and automation ownership', () => {
  const boundActions = [
    ['execute', (taskId: string) => executeAutomationScript({ ...scope, taskId })],
    ['publish', (taskId: string) => publishAutomation('org_1', taskId, 'aut_1')],
    ['restore', (taskId: string) => restoreVersion('org_1', taskId, 'aut_1', 1)],
  ] as const;
  it.each(boundActions)('rejects same-org and foreign task mismatch: %s', async (_name, action) => {
    for (const taskId of ['tsk_same_org_other', 'tsk_other_org']) {
      expect(await action(taskId)).toEqual({ success: false, error: 'Unauthorized' });
    }
    expectNoSideEffects();
  });
  it.each(boundActions)('rejects foreign and missing automation: %s', async (_name, action) => {
    for (const automation of [null, { taskId: 'tsk_1', task: { organizationId: 'org_2' } }]) {
      mocks.automation.mockResolvedValue(automation);
      expect((await action('tsk_1')).success).toBe(false);
    }
    expectNoSideEffects();
  });
  it('rejects foreign and missing upload tasks', async () => {
    for (const task of [null, { organizationId: 'org_2' }]) {
      mocks.task.mockResolvedValue(task);
      expect((await uploadAutomationScript(upload)).success).toBe(false);
    }
    expectNoSideEffects();
  });
  it('rejects extra upload/execute payload fields before forwarding', async () => {
    const unsafeUpload = { ...upload, automationId: 'aut_foreign' };
    expect((await uploadAutomationScript(unsafeUpload)).success).toBe(false);
    const unsafeExecution = { ...scope, scriptKey: 'org_2/script.js' };
    expect((await executeAutomationScript(unsafeExecution)).success).toBe(false);
    expectNoSideEffects();
  });
  it('allows an authorized upload with only validated fields', async () => {
    expect((await uploadAutomationScript(upload)).success).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://enterprise.example/api/tasks-automations/s3/upload',
      expect.objectContaining({ body: JSON.stringify(upload), redirect: 'error' }),
    );
  });
  it.each(['org_2/tsk_2/code.js', 'org_1/../org_2/code.js', 'org_10/code.js'])(
    'rejects unauthorized script prefix: %s',
    async (key) => {
      expect((await getAutomationScript(key)).success).toBe(false);
      expectNoSideEffects();
    },
  );
});

describe('organization-bound run polling receipts', () => {
  it('issues a receipt after authorized execute and polls the original enterprise run', async () => {
    enterpriseResponse({ runId: 'run_1' });
    const execution = await executeAutomationScript(scope);
    if (!execution.success) throw new Error('Execute should succeed');
    expect(execution.data.runId).toMatch(/^v1\./);
    mocks.fetch.mockClear();
    enterpriseResponse({ status: 'COMPLETED' });
    expect((await getAutomationRunStatus(execution.data.runId)).success).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://enterprise.example/api/tasks-automations/runs/run_1',
      expect.anything(),
    );
  });
  it('rejects unknown legacy run IDs and malformed receipts', async () => {
    for (const token of ['run_1', 'v1.bad.bad', 'v2.bad.bad']) {
      expect(await getAutomationRunStatus(token)).toEqual({
        success: false,
        error: 'Unauthorized',
      });
    }
    expectNoSideEffects();
  });
  it('rejects tampering and cross-organization replay', async () => {
    const ownToken = issueRunReceipt(runScope);
    const foreignToken = issueRunReceipt({ ...runScope, organizationId: 'org_2' });
    expect((await getAutomationRunStatus(ownToken.replace('v1.', 'v1.A'))).success).toBe(false);
    expect((await getAutomationRunStatus(foreignToken)).success).toBe(false);
    expectNoSideEffects();
  });
  it('rejects expired receipts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const token = issueRunReceipt(runScope);
    vi.setSystemTime(new Date('2026-10-02T00:00:00Z'));
    expect(await getAutomationRunStatus(token)).toEqual({ success: false, error: 'Unauthorized' });
    expectNoSideEffects();
  });
  it('rechecks automation ownership when polling an otherwise valid receipt', async () => {
    const token = issueRunReceipt(runScope);
    mocks.automation.mockResolvedValue({ taskId: 'tsk_other', task: { organizationId: 'org_1' } });
    expect((await getAutomationRunStatus(token)).success).toBe(false);
    expectNoSideEffects();
  });
});

describe('publish persistence and response validation', () => {
  beforeEach(() =>
    enterpriseResponse({ success: true, version: 1, scriptKey: 'org_1/tsk_1/aut_1.v1.js' }),
  );
  it('publishes and returns the recorded version for an authorized admin', async () => {
    expect(await publishAutomation('org_1', 'tsk_1', 'aut_1')).toEqual({
      success: true,
      version: { version: 1 },
    });
    expect(mocks.post).toHaveBeenCalledWith('/v1/tasks/tsk_1/automations/aut_1/versions', {
      version: 1,
      scriptKey: 'org_1/tsk_1/aut_1.v1.js',
      changelog: undefined,
    });
  });
  it.each([403, 500, 0])(
    'does not report successful publication after persistence status %s',
    async (status) => {
      mocks.post.mockResolvedValue({ status, error: 'API failed' });
      expect((await publishAutomation('org_1', 'tsk_1', 'aut_1')).success).toBe(false);
    },
  );
  it('rejects a foreign script key returned by enterprise', async () => {
    enterpriseResponse({ success: true, version: 1, scriptKey: 'org_2/tsk_2/aut_2.v1.js' });
    expect((await publishAutomation('org_1', 'tsk_1', 'aut_1')).success).toBe(false);
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('rejects malformed successful persistence responses', async () => {
    mocks.post.mockResolvedValue({ status: 201, data: {} });
    expect((await publishAutomation('org_1', 'tsk_1', 'aut_1')).success).toBe(false);
  });
});

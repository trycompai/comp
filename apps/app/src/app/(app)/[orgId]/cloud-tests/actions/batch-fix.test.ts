import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  get: vi.fn(),
  trigger: vi.fn(),
  createPublicToken: vi.fn(),
  cancel: vi.fn(),
  retrieve: vi.fn(),
}));
vi.mock('@/lib/api-server', () => ({
  serverApi: { post: mocks.post, patch: mocks.patch, get: mocks.get },
}));
vi.mock('@trigger.dev/sdk', () => ({
  auth: { createPublicToken: mocks.createPublicToken },
  tasks: { trigger: mocks.trigger },
  runs: { retrieve: mocks.retrieve, cancel: mocks.cancel },
}));

import * as integration from '../../integrations/[slug]/actions/batch-fix';
import * as cloud from './batch-fix';

const input = {
  organizationId: 'org_own',
  connectionId: 'conn_own',
  findings: [{ id: 'finding_own', key: 'key', title: 'Finding' }],
};
const batch = {
  id: 'rmb_own',
  organizationId: 'org_own',
  connectionId: 'conn_own',
  triggerRunId: 'run_own',
  findings: [],
};
const run = {
  taskIdentifier: 'remediate-batch',
  tags: ['org_own'],
  payload: { batchId: 'rmb_own', organizationId: 'org_own', connectionId: 'conn_own' },
  status: 'EXECUTING',
};

describe.each([
  ['cloud', cloud],
  ['integration', integration],
] as const)('%s batch actions', (_name, actions) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.post.mockResolvedValue({ status: 200, data: { data: batch } });
    mocks.patch.mockResolvedValue({ status: 200, data: { data: batch } });
    mocks.get.mockResolvedValue({ status: 200, data: { data: batch } });
    mocks.trigger.mockResolvedValue({ id: 'run_own' });
    mocks.createPublicToken.mockResolvedValue('public_token');
    mocks.retrieve.mockResolvedValue(run);
    mocks.cancel.mockResolvedValue({ id: 'run_own' });
  });

  it('triggers and tags using authoritative batch ownership', async () => {
    const result = await actions.startBatchFix(input);
    expect(result.data?.runId).toBe('run_own');
    expect(mocks.trigger).toHaveBeenCalledWith(
      'remediate-batch',
      { batchId: 'rmb_own', organizationId: 'org_own', connectionId: 'conn_own' },
      { tags: ['org_own'] },
    );
  });
  it('binds a fast completed run without asking to restart its batch', async () => {
    mocks.patch.mockResolvedValue({ status: 200, data: { data: { ...batch, status: 'done' } } });
    expect((await actions.startBatchFix(input)).data?.runId).toBe('run_own');
    expect(mocks.patch).toHaveBeenCalledWith('/v1/cloud-security/remediation/batch/rmb_own', {
      triggerRunId: 'run_own',
    });
  });

  it('rejects caller organization mismatch before triggering', async () => {
    const result = await actions.startBatchFix({ ...input, organizationId: 'org_foreign' });
    expect(result.error).toBeDefined();
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it('rejects caller connection mismatch before triggering', async () => {
    const result = await actions.startBatchFix({ ...input, connectionId: 'conn_foreign' });
    expect(result.error).toBeDefined();
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it('rejects read-only callers denied by the API before triggering', async () => {
    mocks.post.mockResolvedValue({ status: 403, error: 'Forbidden' });
    const result = await actions.startBatchFix(input);
    expect(result.error).toBeDefined();
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it('does not mint a token when API run binding fails and cancels only its new run', async () => {
    mocks.patch.mockResolvedValue({ status: 403, error: 'Forbidden' });
    const result = await actions.startBatchFix(input);
    expect(result.error).toBe('Forbidden');
    expect(mocks.cancel).toHaveBeenCalledWith('run_own');
    expect(mocks.createPublicToken).not.toHaveBeenCalled();
  });

  it('delegates cancellation to the authorized API batch endpoint', async () => {
    await actions.cancelBatchFix('run_own', 'rmb_own');
    expect(mocks.post).toHaveBeenCalledWith('/v1/cloud-security/remediation/batch/rmb_own/cancel', {
      runId: 'run_own',
    });
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404])('fails cancellation closed on API %s', async (status) => {
    mocks.post.mockResolvedValue({ status, error: 'Denied' });
    await expect(actions.cancelBatchFix('run_foreign', 'rmb_foreign')).rejects.toThrow('Denied');
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it('resumes only a correctly bound run', async () => {
    const result = await actions.getActiveBatch('conn_own');
    expect(result?.triggerRunId).toBe('run_own');
    expect(mocks.createPublicToken).toHaveBeenCalled();
  });

  it.each([
    { ...run, taskIdentifier: 'other-task' },
    { ...run, tags: ['org_foreign'] },
    { ...run, payload: { ...run.payload, batchId: 'rmb_foreign' } },
  ])('does not mint tokens for forged legacy bindings: %p', async (forged) => {
    mocks.retrieve.mockResolvedValue(forged);
    expect(await actions.getActiveBatch('conn_own')).toBeNull();
    expect(mocks.createPublicToken).not.toHaveBeenCalled();
  });
});

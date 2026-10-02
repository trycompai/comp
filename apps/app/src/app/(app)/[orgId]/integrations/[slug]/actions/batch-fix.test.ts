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
  runs: { cancel: mocks.cancel, retrieve: mocks.retrieve },
  tasks: { trigger: mocks.trigger },
}));

import { startBatchFix } from './batch-fix';

const input = {
  organizationId: 'org_auth',
  connectionId: 'icn_1',
  findings: [{ id: 'finding_1', key: 'fix-key', title: 'Finding' }],
};
const batch = {
  id: 'rbt_1',
  organizationId: 'org_auth',
  connectionId: 'icn_1',
  findings: [{ ...input.findings[0], status: 'pending' }],
};

describe('startBatchFix', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.post.mockResolvedValue({ data: { data: batch }, status: 200 });
    mocks.patch.mockResolvedValue({ data: { data: batch }, status: 200 });
    mocks.trigger.mockResolvedValue({ id: 'run_1' });
    mocks.createPublicToken.mockResolvedValue('token');
  });

  it('rejects caller organization mismatches instead of allowing caller-controlled run ownership', async () => {
    const result = await startBatchFix({ ...input, organizationId: 'org_victim' });
    expect(result.error).toBe('Batch ownership mismatch');
    expect(mocks.trigger).not.toHaveBeenCalled();
    expect(mocks.createPublicToken).not.toHaveBeenCalled();
  });

  it('fails without triggering when the batch response carries no organization', async () => {
    mocks.post.mockResolvedValue({
      data: { data: { id: 'rbt_1', connectionId: 'icn_1', findings: batch.findings } },
      status: 200,
    });
    const result = await startBatchFix(input);
    expect(result.error).toBe('Invalid batch response');
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it('triggers with API-authorized organization and connection, binds the run, and expires its token', async () => {
    const result = await startBatchFix(input);
    expect(mocks.trigger).toHaveBeenCalledWith(
      'remediate-batch',
      {
        batchId: 'rbt_1',
        organizationId: 'org_auth',
        connectionId: 'icn_1',
      },
      { tags: ['org_auth'] },
    );
    expect(mocks.patch).toHaveBeenCalledWith('/v1/cloud-security/remediation/batch/rbt_1', {
      triggerRunId: 'run_1',
    });
    expect(mocks.createPublicToken).toHaveBeenCalledWith({
      scopes: { read: { runs: ['run_1'] } },
      expirationTime: '15m',
    });
    expect(result.data?.runId).toBe('run_1');
  });
});

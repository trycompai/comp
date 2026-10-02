import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-server', () => ({
  serverApi: { post: vi.fn(), patch: vi.fn(), get: vi.fn() },
}));

vi.mock('@trigger.dev/sdk', () => ({
  auth: { createPublicToken: vi.fn() },
  runs: { cancel: vi.fn(), retrieve: vi.fn() },
  tasks: { trigger: vi.fn() },
}));

import { serverApi } from '@/lib/api-server';
import { auth, tasks } from '@trigger.dev/sdk';
import { startBatchFix } from './batch-fix';

const mockPost = vi.mocked(serverApi.post);
const mockTrigger = vi.mocked(tasks.trigger);
const mockCreateToken = vi.mocked(auth.createPublicToken);

describe('startBatchFix', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('tags the run with the organization the API scoped the batch to, not the caller-supplied one', async () => {
    mockPost.mockResolvedValue({
      data: { data: { id: 'rbt_1', organizationId: 'org_auth' } },
      status: 200,
    });
    mockTrigger.mockResolvedValue({ id: 'run_1' } as Awaited<ReturnType<typeof tasks.trigger>>);
    mockCreateToken.mockResolvedValue('token');

    const result = await startBatchFix({
      organizationId: 'org_victim',
      connectionId: 'icn_1',
      findings: [],
    });

    expect(mockTrigger).toHaveBeenCalledWith(
      'remediate-batch',
      expect.objectContaining({ batchId: 'rbt_1', organizationId: 'org_auth' }),
      { tags: ['org_auth'] },
    );
    expect(result.data?.runId).toBe('run_1');
  });

  it('fails without triggering when the batch response carries no organization', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'rbt_1' } }, status: 200 } as never);

    const result = await startBatchFix({
      organizationId: 'org_victim',
      connectionId: 'icn_1',
      findings: [],
    });

    expect(result.error).toBe('Failed to create batch record');
    expect(mockTrigger).not.toHaveBeenCalled();
  });
});

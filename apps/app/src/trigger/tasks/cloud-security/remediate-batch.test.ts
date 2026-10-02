import { beforeEach, describe, expect, it, vi } from 'vitest';
import './remediate-batch';

type Payload = { batchId: string; organizationId: string; connectionId: string };
const mocks = vi.hoisted(() => {
  const handler: { run?: (payload: Payload) => Promise<unknown> } = {};
  return {
    handler,
    findUnique: vi.fn(),
    update: vi.fn(),
    findConnection: vi.fn(),
    tryFix: vi.fn(),
    task: vi.fn((definition: { id: string; run: (payload: Payload) => Promise<unknown> }) => {
      handler.run = definition.run;
      return { id: definition.id };
    }),
  };
});
vi.mock('@trigger.dev/sdk', () => ({ task: mocks.task, logger: { info: vi.fn() } }));
vi.mock('@db/server', () => ({
  db: {
    remediationBatch: { findUnique: mocks.findUnique, update: mocks.update },
    integrationConnection: { findFirst: mocks.findConnection },
  },
}));
vi.mock('./remediate-batch-helpers', () => ({
  tryFix: mocks.tryFix,
  sync: vi.fn(),
  persistProgress: vi.fn(),
  isCancelled: vi.fn(async () => false),
  isFindingCancelled: vi.fn(async () => false),
}));
vi.mock('./api-response', () => ({ postCloudSecurityApi: vi.fn() }));

const payload = { batchId: 'rmb_own', organizationId: 'org_own', connectionId: 'conn_own' };
const batch = {
  id: 'rmb_own',
  organizationId: 'org_own',
  connectionId: 'conn_own',
  initiatedById: 'usr_own',
  status: 'pending',
  findings: [{ id: 'finding_own', key: 'fix-key', title: 'Finding', status: 'pending' }],
};
async function execute(input: Payload) {
  if (!mocks.handler.run) throw new Error('Task not registered');
  return mocks.handler.run(input);
}

describe('remediate-batch ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(batch);
    mocks.findConnection.mockResolvedValue({ id: 'conn_own' });
    mocks.tryFix.mockResolvedValue({ status: 'skipped' });
  });

  it('executes an authorized batch using persisted ownership', async () => {
    await execute(payload);
    expect(mocks.tryFix).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'finding_own' }),
      'conn_own',
      'org_own',
      'usr_own',
    );
  });

  it.each([
    { ...payload, organizationId: 'org_foreign' },
    { ...payload, connectionId: 'conn_foreign' },
  ])('rejects forged payload before writes or API calls: %p', async (forged) => {
    await expect(execute(forged)).rejects.toThrow('Batch ownership mismatch');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.tryFix).not.toHaveBeenCalled();
  });

  it('rejects a legacy batch pointing at another organization connection', async () => {
    mocks.findConnection.mockResolvedValue(null);
    await expect(execute(payload)).rejects.toThrow('Batch connection not found');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.tryFix).not.toHaveBeenCalled();
  });

  it('does not restart a cancelled batch', async () => {
    mocks.findUnique.mockResolvedValue({ ...batch, status: 'cancelled' });
    await execute(payload);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.tryFix).not.toHaveBeenCalled();
  });
});

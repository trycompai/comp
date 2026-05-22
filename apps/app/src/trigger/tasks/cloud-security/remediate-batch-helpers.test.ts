import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@db/server', () => {
  const remediationBatch = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };

  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message: string, options: { code: string }) {
      super(message);
      this.code = options.code;
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError,
      TransactionIsolationLevel: { Serializable: 'Serializable' },
    },
    db: {
      remediationBatch,
      $transaction: vi.fn(
        (callback: (tx: { remediationBatch: typeof remediationBatch }) => unknown) =>
          callback({ remediationBatch }),
      ),
    },
  };
});

vi.mock('@trigger.dev/sdk', () => ({
  metadata: { set: vi.fn() },
}));

vi.mock('./api-response', () => ({
  postCloudSecurityApi: vi.fn(),
}));

import { Prisma, db } from '@db/server';
import {
  persistProgress,
  type BatchProgress,
  type FindingProgress,
} from './remediate-batch-helpers';

type MockRemediationBatch = {
  findUnique: Mock;
  update: Mock;
};

type MockDb = {
  remediationBatch: MockRemediationBatch;
  $transaction: Mock;
};

const mockedDb = db as unknown as MockDb;
const remediationBatch = mockedDb.remediationBatch;

function finding(overrides: Partial<FindingProgress>): FindingProgress {
  return {
    id: overrides.id ?? 'check-1',
    key: overrides.key ?? 'finding-key',
    title: overrides.title ?? 'Finding',
    status: overrides.status ?? 'pending',
    error: overrides.error,
    missingPermissions: overrides.missingPermissions,
  };
}

function progress(findings: FindingProgress[]): BatchProgress {
  return {
    current: 1,
    total: findings.length,
    fixed: 0,
    skipped: 0,
    failed: 0,
    findings,
    phase: 'running',
    confirmedPermissions: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('persistProgress', () => {
  it('preserves concurrent per-finding cancellations before writing progress', async () => {
    remediationBatch.findUnique.mockResolvedValue({
      findings: [
        finding({ id: 'check-1', status: 'pending' }),
        finding({
          id: 'check-2',
          status: 'cancelled',
          error: 'Removed by user',
        }),
      ],
    });
    remediationBatch.update.mockResolvedValue({});

    const batchProgress = progress([
      finding({ id: 'check-1', status: 'fixed' }),
      finding({ id: 'check-2', status: 'pending' }),
    ]);

    await persistProgress('batch-1', batchProgress, 'done');

    expect(mockedDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });

    expect(batchProgress.findings[1]).toMatchObject({
      id: 'check-2',
      status: 'cancelled',
      error: 'Removed by user',
      missingPermissions: undefined,
    });
    expect(batchProgress.fixed).toBe(1);
    expect(batchProgress.skipped).toBe(1);
    expect(batchProgress.failed).toBe(0);

    expect(remediationBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: expect.objectContaining({
        status: 'done',
        fixed: 1,
        skipped: 1,
        failed: 0,
        findings: expect.arrayContaining([
          expect.objectContaining({ id: 'check-2', status: 'cancelled' }),
        ]),
      }),
    });
  });

  it('retries after a serializable transaction conflict and re-reads cancellations', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('write conflict', {
      code: 'P2034',
      clientVersion: 'test',
    });

    mockedDb.$transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(
        (callback: (tx: { remediationBatch: MockRemediationBatch }) => unknown) =>
          callback({ remediationBatch }),
      );
    remediationBatch.findUnique.mockResolvedValue({
      findings: [finding({ id: 'check-1', status: 'cancelled', error: 'Removed during retry' })],
    });
    remediationBatch.update.mockResolvedValue({});

    const batchProgress = progress([finding({ id: 'check-1', status: 'fixed' })]);

    await persistProgress('batch-1', batchProgress, 'done');

    expect(mockedDb.$transaction).toHaveBeenCalledTimes(2);
    expect(remediationBatch.findUnique).toHaveBeenCalledTimes(1);
    expect(batchProgress.findings[0]).toMatchObject({
      id: 'check-1',
      status: 'cancelled',
      error: 'Removed during retry',
    });
    expect(remediationBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: expect.objectContaining({
        status: 'done',
        fixed: 0,
        skipped: 1,
        failed: 0,
      }),
    });
  });
});

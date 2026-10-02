import { BadRequestException, ConflictException } from '@nestjs/common';
import { RemediationBatchService } from './remediation-batch.service';
import { isDeepStrictEqual } from 'node:util';

jest.mock('@db', () => ({
  db: {
    remediationBatch: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock('@trigger.dev/sdk', () => ({
  auth: {
    withAuth: jest.fn((_config: unknown, action: () => Promise<unknown>) =>
      action(),
    ),
  },
  runs: { retrieve: jest.fn(), cancel: jest.fn() },
}));
jest.mock('./cloud-security-audit', () => ({
  logCloudSecurityActivity: jest.fn(),
}));

type StoredBatch = {
  id: string;
  organizationId: string;
  connectionId: string;
  initiatedById: string;
  triggerRunId: string | null;
  status: string;
  findings: Array<{ id: string; key: string; title: string; status: string }>;
};
type Write = {
  where: {
    status?: string | { in: string[] };
    triggerRunId?: string | null;
    findings?: { equals: unknown };
  };
  data: {
    status?: string;
    triggerRunId?: string;
    findings?: StoredBatch['findings'];
  };
};
const db = jest.requireMock<{
  db: {
    remediationBatch: {
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
}>('@db').db;
const sdk = jest.requireMock<{
  runs: { retrieve: jest.Mock; cancel: jest.Mock };
}>('@trigger.dev/sdk');
const params = { batchId: 'rmb_own', organizationId: 'org_own' };

describe('Remediation batch mutation interleavings', () => {
  const service = new RemediationBatchService();
  let stored: StoredBatch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRIGGER_APP_SECRET_KEY = 'test_app_project_key';
    stored = {
      id: 'rmb_own',
      organizationId: 'org_own',
      connectionId: 'conn_own',
      initiatedById: 'usr_own',
      triggerRunId: 'run_own',
      status: 'running',
      findings: ['a', 'b'].map((id) => ({
        id,
        key: 'fix',
        title: id,
        status: 'pending',
      })),
    };
    db.remediationBatch.findFirst.mockImplementation(() =>
      Promise.resolve(structuredClone(stored)),
    );
    db.remediationBatch.update.mockImplementation(({ data }: Write) => {
      Object.assign(stored, data);
      return Promise.resolve(structuredClone(stored));
    });
    db.remediationBatch.updateMany.mockImplementation(
      ({ where, data }: Write) => {
        const statusMatches =
          !where.status ||
          (typeof where.status === 'string'
            ? stored.status === where.status
            : where.status.in.includes(stored.status));
        if (
          !statusMatches ||
          (where.triggerRunId !== undefined &&
            stored.triggerRunId !== where.triggerRunId) ||
          (where.findings &&
            !isDeepStrictEqual(where.findings.equals, stored.findings))
        ) {
          return Promise.resolve({ count: 0 });
        }
        Object.assign(stored, data);
        return Promise.resolve({ count: 1 });
      },
    );
    sdk.runs.retrieve.mockResolvedValue({
      taskIdentifier: 'remediate-batch',
      tags: ['org_own'],
      payload: {
        batchId: 'rmb_own',
        organizationId: 'org_own',
        connectionId: 'conn_own',
      },
    });
    sdk.runs.cancel.mockResolvedValue({ id: 'run_own' });
  });
  afterEach(() => {
    delete process.env.TRIGGER_APP_SECRET_KEY;
  });

  it('does not restore running when cancellation commits during run validation', async () => {
    sdk.runs.retrieve.mockImplementationOnce(() => {
      stored.status = 'cancelled';
      return Promise.resolve({
        taskIdentifier: 'remediate-batch',
        tags: ['org_own'],
        payload: {
          batchId: 'rmb_own',
          organizationId: 'org_own',
          connectionId: 'conn_own',
        },
      });
    });
    await expect(
      service.update({
        ...params,
        body: { triggerRunId: 'run_own', status: 'running' },
      }),
    ).rejects.toThrow(ConflictException);
    expect(stored.status).toBe('cancelled');
  });

  it.each([
    ['done', 'running'],
    ['cancelled', 'running'],
    ['cancelled', 'done'],
    ['done', 'cancelled'],
  ] as const)(
    'rejects terminal status transition %s -> %s',
    async (initial, next) => {
      stored.status = initial;
      await expect(
        service.update({ ...params, body: { status: next } }),
      ).rejects.toThrow(BadRequestException);
      expect(stored.status).toBe(initial);
    },
  );

  it('binds a fast completed run without restoring running', async () => {
    stored.status = 'done';
    stored.triggerRunId = null;
    await service.update({ ...params, body: { triggerRunId: 'run_own' } });
    expect(stored.status).toBe('done');
    expect(stored.triggerRunId).toBe('run_own');
  });

  it('preserves completed status when worker completion commits during cancellation', async () => {
    sdk.runs.cancel.mockImplementationOnce(() => {
      stored.status = 'done';
      return Promise.resolve({ id: 'run_own' });
    });
    const result = await service.cancel({ ...params, runId: 'run_own' });
    expect(result.status).toBe('done');
    expect(stored.status).toBe('done');
  });

  it('preserves both skips when callers read the same initial findings', async () => {
    await Promise.all([
      service.skip({ ...params, findingId: 'a' }),
      service.skip({ ...params, findingId: 'b' }),
    ]);
    expect(stored.findings.map((finding) => finding.status)).toEqual([
      'cancelled',
      'cancelled',
    ]);
    expect(db.remediationBatch.updateMany).toHaveBeenCalledTimes(3);
  });

  it('retries a skip after a concurrent worker progress write without losing that progress', async () => {
    const apply = db.remediationBatch.updateMany.getMockImplementation();
    db.remediationBatch.updateMany.mockImplementationOnce(() => {
      const first = stored.findings[0];
      if (!first) throw new Error('Finding missing');
      first.status = 'fixed';
      return Promise.resolve({ count: 0 });
    });
    if (!apply) throw new Error('CAS implementation missing');
    db.remediationBatch.updateMany.mockImplementation(apply);
    await service.skip({ ...params, findingId: 'b' });
    expect(stored.findings.map((finding) => finding.status)).toEqual([
      'fixed',
      'cancelled',
    ]);
  });

  it('stops safely after repeated write conflicts', async () => {
    db.remediationBatch.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.skip({ ...params, findingId: 'a' })).rejects.toThrow(
      ConflictException,
    );
    expect(stored.findings[0]?.status).toBe('pending');
    expect(db.remediationBatch.updateMany).toHaveBeenCalledTimes(3);
  });
});

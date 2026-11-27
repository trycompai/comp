jest.mock('./aws-scan-evidence', () => ({
  ...jest.requireActual('./aws-scan-evidence'),
  awsScanEvidence: jest.fn(),
}));

jest.mock('@db', () => ({
  Prisma: jest.requireActual('@prisma/client').Prisma,
  db: {
    task: { findMany: jest.fn(), updateMany: jest.fn() },
    integrationConnection: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'synthetic-connection',
          providerId: 'provider',
          status: 'active',
          metadata: null,
          variables: {},
          activeCredentialVersionId: 'revision',
          credentialVersions: [{ id: 'revision', version: 1 }],
          provider: {
            id: 'provider',
            slug: 'aws',
            isActive: true,
            manifestHash: null,
            updatedAt: new Date(0),
          },
        },
      ]),
    },
    $transaction: jest.fn((callback) => callback(jest.requireMock('@db').db)),
  },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(() => ({ id: 'aws', checks: [] })),
  isCodeManifest: jest.fn(() => true),
}));

import { db, type Prisma } from '@db';
import { autoSatisfyAwsTasks as satisfyStoredScan } from './aws-task-completion';
import { awsScanEvidence, passingAwsTemplates } from './aws-scan-evidence';
import type { SecurityFinding } from './cloud-security.service';

async function autoSatisfyAwsTasks({
  organizationId,
  findings,
}: {
  organizationId: string;
  findings: SecurityFinding[];
}) {
  const passing = passingAwsTemplates(
    findings.map((row) => ({
      passed: row.passed === true,
      evidence: (row.evidence ?? {}) as Prisma.JsonObject,
    })),
  );
  (awsScanEvidence as jest.Mock).mockResolvedValue({
    ...passing,
    condition: { id: { not: '' } },
  });
  return satisfyStoredScan({
    organizationId,
    connectionId: 'synthetic-connection',
    runId: 'synthetic-run',
  });
}
import {
  candidate,
  finding,
} from '../../test/fixtures/aws-task-completion-data';

const taskMocks = db.task as unknown as {
  findMany: jest.Mock<Promise<unknown>, [Prisma.TaskFindManyArgs]>;
  updateMany: jest.Mock<
    Promise<{ count: number }>,
    [Prisma.TaskUpdateManyArgs]
  >;
};

describe('AWS cloud-scan task completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    taskMocks.findMany.mockResolvedValue([candidate()]);
    taskMocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it.each(['fail', null] as const)(
    'retains a task after successful collection with evaluation=%s',
    async (evaluationStatus) => {
      const task = candidate();
      task.evidenceAutomations[0].runs[0].evaluationStatus = evaluationStatus;
      taskMocks.findMany.mockResolvedValue([task]);
      await autoSatisfyAwsTasks({
        organizationId: 'synthetic-org',
        findings: [finding()],
      });
      expect(taskMocks.updateMany).not.toHaveBeenCalled();
    },
  );

  it('retains a task without any custom run evidence', async () => {
    const task = candidate();
    task.evidenceAutomations[0].runs = [];
    taskMocks.findMany.mockResolvedValue([task]);
    await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding()],
    });
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });

  it('does not bypass assigned approval', async () => {
    taskMocks.findMany.mockResolvedValue([
      candidate({ approverId: 'reviewer' }),
    ]);
    await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding()],
    });
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });

  it.each(['in_review', 'done', 'not_relevant'] as const)(
    'preserves a %s task',
    async (status) => {
      taskMocks.findMany.mockResolvedValue([candidate({ status })]);
      await autoSatisfyAwsTasks({
        organizationId: 'synthetic-org',
        findings: [finding()],
      });
      expect(taskMocks.updateMany).not.toHaveBeenCalled();
    },
  );

  it('preserves manual and archived tasks', async () => {
    taskMocks.findMany.mockResolvedValue([
      candidate({ automationStatus: 'MANUAL' }),
      candidate({ archivedAt: new Date() }),
    ]);
    await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding()],
    });
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });

  it('only completes the fully qualified candidate in a mixed batch', async () => {
    const failed = candidate({ id: 'failed-task' });
    failed.evidenceAutomations[0].runs[0].evaluationStatus = 'fail';
    taskMocks.findMany.mockResolvedValue([
      failed,
      candidate({ id: 'passing-task' }),
    ]);
    const result = await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding()],
    });
    expect(result.count).toBe(1);
    expect(taskMocks.updateMany).toHaveBeenCalledTimes(1);
    expect(taskMocks.updateMany.mock.calls[0][0].where).toMatchObject({
      id: 'passing-task',
    });
    expect(
      Object.keys(taskMocks.updateMany.mock.calls[0][0].data).sort(),
    ).toEqual(['lastCompletedAt', 'status']);
  });

  it('reports zero when the conditional write observes changed evidence/state', async () => {
    taskMocks.updateMany.mockResolvedValue({ count: 0 });
    const result = await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding()],
    });
    expect(result.count).toBe(0);
  });

  it('does not query or write without a passing mapped service', async () => {
    await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [],
    });
    await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding({ passed: false })],
    });
    await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding({ serviceId: 'not-a-mapped-service' })],
    });
    expect(taskMocks.findMany).not.toHaveBeenCalled();
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });

  it('retains a failure in another scanned service mapped to the same task', async () => {
    await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding(), finding({ serviceId: 's3', passed: false })],
    });
    expect(taskMocks.findMany).not.toHaveBeenCalled();
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });

  it('keeps the existing no-custom-collector qualification path', async () => {
    taskMocks.findMany.mockResolvedValue([
      candidate({ evidenceAutomations: [] }),
    ]);
    const result = await autoSatisfyAwsTasks({
      organizationId: 'synthetic-org',
      findings: [finding()],
    });
    expect(result.count).toBe(1);
    expect(taskMocks.updateMany.mock.calls[0][0].where).toMatchObject({
      organizationId: 'synthetic-org',
    });
    expect(taskMocks.findMany.mock.calls[0][0].where).toMatchObject({
      organizationId: 'synthetic-org',
      status: { in: ['todo', 'in_progress', 'failed'] },
      automationStatus: 'AUTOMATED',
      archivedAt: null,
    });
  });

  it('propagates evidence-read failures without completing a task', async () => {
    taskMocks.findMany.mockRejectedValue(
      new Error('synthetic unavailable evidence'),
    );
    await expect(
      autoSatisfyAwsTasks({
        organizationId: 'synthetic-org',
        findings: [finding()],
      }),
    ).rejects.toThrow('unavailable evidence');
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });
});

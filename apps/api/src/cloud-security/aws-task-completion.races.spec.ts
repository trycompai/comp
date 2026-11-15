jest.mock('@db', () => ({
  db: { task: { findMany: jest.fn(), updateMany: jest.fn() } },
}));

import { db, type Prisma } from '@db';
import {
  CompletionDatabase,
  AUTOMATION,
  ORG,
  TASK,
} from '../../test/fixtures/aws-task-completion-db';
import {
  CRITERIA,
  finding,
  NOW,
} from '../../test/fixtures/aws-task-completion-data';
import { autoSatisfyAwsTasks } from './aws-task-completion';

const taskMocks = db.task as unknown as {
  findMany: jest.Mock<Promise<unknown>, [Prisma.TaskFindManyArgs]>;
  updateMany: jest.Mock<
    Promise<{ count: number }>,
    [Prisma.TaskUpdateManyArgs]
  >;
};

describe('actual PostgreSQL conditional task completion', () => {
  let database: CompletionDatabase;
  let mutation: () => Promise<unknown>;

  beforeAll(async () => {
    database = new CompletionDatabase();
    await database.initialize();
  }, 30000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await database.seed();
    jest.clearAllMocks();
    mutation = () => Promise.resolve(undefined);
    taskMocks.findMany.mockImplementation((args: Prisma.TaskFindManyArgs) =>
      database.client.task.findMany(args),
    );
    taskMocks.updateMany.mockImplementation(
      async (args: Prisma.TaskUpdateManyArgs) => {
        await mutation();
        return database.client.task.updateMany(args);
      },
    );
  });

  async function complete() {
    await autoSatisfyAwsTasks({ organizationId: ORG, findings: [finding()] });
    return database.client.task.findUniqueOrThrow({
      where: { id: TASK },
      select: { status: true, automationStatus: true, lastCompletedAt: true },
    });
  }

  it('applies the actual nullable migration without backfilling history', () => {
    expect(database.historicalSnapshot).toBeNull();
  });

  it('completes an unchanged, fully evaluated task through the actual SQL', async () => {
    const task = await complete();
    expect(task.status).toBe('done');
    expect(task.lastCompletedAt).not.toBeNull();
  });

  it.each(['pending', 'failed'] as const)(
    'retains a new %s run arriving after admission',
    async (status) => {
      mutation = async () => {
        await database.admin
          .$executeRaw`INSERT INTO ${database.namespace}."EvidenceAutomationRun"
          (id,"evidenceAutomationId","createdAt","updatedAt",status)
          VALUES ('newer',${AUTOMATION},${new Date(NOW.getTime() + 1)},${NOW},
            ${status}::${database.namespace}."EvidenceAutomationRunStatus")`;
      };
      expect(await complete()).toMatchObject({
        status: 'failed',
        lastCompletedAt: null,
      });
    },
  );

  it('retains a collector enabled after admission', async () => {
    mutation = async () => {
      await database.admin
        .$executeRaw`INSERT INTO ${database.namespace}."EvidenceAutomation"
        VALUES ('new-collector',${TASK},true,${CRITERIA})`;
    };
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
  });

  it('retains a previously disabled collector reenabled after admission', async () => {
    await database.admin
      .$executeRaw`INSERT INTO ${database.namespace}."EvidenceAutomation"
      VALUES ('disabled-collector',${TASK},false,${CRITERIA})`;
    mutation = () =>
      database.client.evidenceAutomation.updateMany({
        where: { id: 'disabled-collector' },
        data: { isEnabled: true },
      });
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
  });

  it('retains a pass changed to fail after admission', async () => {
    mutation = () =>
      database.client.evidenceAutomationRun.updateMany({
        where: { id: 'latest-run' },
        data: { evaluationStatus: 'fail' },
      });
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
  });

  it('preserves review entered after admission', async () => {
    mutation = () =>
      database.client.task.updateMany({
        where: { id: TASK },
        data: { status: 'in_review' },
      });
    expect(await complete()).toMatchObject({
      status: 'in_review',
      lastCompletedAt: null,
    });
  });

  it('preserves a human approver assigned after admission', async () => {
    mutation = () =>
      database.client.task.updateMany({
        where: { id: TASK },
        data: { approverId: 'new-reviewer' },
      });
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
  });

  it('rechecks organization approval configuration after admission', async () => {
    await database.admin.$executeRaw`UPDATE ${database.namespace}."Organization"
      SET "evidenceApprovalEnabled"=false WHERE id=${ORG}`;
    await database.client.task.updateMany({
      where: { id: TASK },
      data: { approverId: 'stale-reviewer' },
    });
    mutation = () => database.admin
      .$executeRaw`UPDATE ${database.namespace}."Organization"
      SET "evidenceApprovalEnabled"=true WHERE id=${ORG}`;
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
  });

  it('preserves the manual designation set after admission', async () => {
    mutation = () =>
      database.client.task.updateMany({
        where: { id: TASK },
        data: { automationStatus: 'MANUAL' },
      });
    expect(await complete()).toMatchObject({
      status: 'failed',
      automationStatus: 'MANUAL',
      lastCompletedAt: null,
    });
  });

  it('retains changed criteria after admission', async () => {
    mutation = () =>
      database.client.evidenceAutomation.updateMany({
        where: { id: AUTOMATION },
        data: { evaluationCriteria: 'Stricter current criteria' },
      });
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
  });

  it('retains a publication added after admission', async () => {
    mutation = async () => {
      await database.admin
        .$executeRaw`INSERT INTO ${database.namespace}."EvidenceAutomationVersion"
        VALUES ('version-3',${AUTOMATION},3,${NOW},'v3')`;
    };
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
  });

  it('retains a same-version source edit after admission', async () => {
    mutation = () =>
      database.client.evidenceAutomationVersion.updateMany({
        where: { id: 'version-2' },
        data: {
          scriptKey: 'changed-source',
          updatedAt: new Date(NOW.getTime() + 1),
        },
      });
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
  });

  it('does not use old criteria after a change made before admission', async () => {
    await database.client.evidenceAutomation.updateMany({
      where: { id: AUTOMATION },
      data: { evaluationCriteria: 'Different current criteria' },
    });
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });

  it('does not qualify a historical run without a criteria snapshot', async () => {
    await database.client.evidenceAutomationRun.updateMany({
      where: { id: 'latest-run' },
      data: { evaluationCriteriaSnapshot: null },
    });
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });

  it('does not reuse a same-version pass after a prior source edit', async () => {
    await database.client.evidenceAutomationVersion.updateMany({
      where: { id: 'version-2' },
      data: { updatedAt: new Date(NOW.getTime() + 1) },
    });
    expect(await complete()).toMatchObject({
      status: 'failed',
      lastCompletedAt: null,
    });
    expect(taskMocks.updateMany).not.toHaveBeenCalled();
  });
});

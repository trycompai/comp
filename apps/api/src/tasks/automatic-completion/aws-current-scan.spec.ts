jest.mock('@db', () => ({
  Prisma: jest.requireActual('@prisma/client').Prisma,
  db: {
    task: { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    integrationConnection: { findMany: jest.fn() },
    integrationCheckRun: { findFirst: jest.fn() },
    integrationCheckResult: { count: jest.fn(), findMany: jest.fn() },
    findingException: { findMany: jest.fn() },
    dynamicIntegration: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@trycompai/integration-platform', () => ({
  ...jest.requireActual('../../../test/fixtures/native-completion-sdk')
    .nativeSdk,
  getManifest: jest.fn(() => ({ id: 'aws', checks: [] })),
}));

import {
  CompletionDatabase,
  ORG,
  TASK,
} from '../../../test/fixtures/aws-task-completion-db';
import { NOW } from '../../../test/fixtures/aws-task-completion-data';
import { bindCompletionDatabase } from '../../../test/fixtures/native-completion-mocks';
import { seedAwsScanEvidence } from '../../../test/fixtures/aws-scan-data';
import {
  nativeSdk,
  NATIVE_SOURCE_FIXTURE,
} from '../../../test/fixtures/native-completion-sdk';
import { autoSatisfyAwsTasks } from '../../cloud-security/aws-task-completion';
import { completeTaskAutomatically } from './complete-task-automatically';

describe('actual PostgreSQL current shared AWS scan evidence', () => {
  let database: CompletionDatabase;
  let beforeWrite: () => Promise<unknown>;
  beforeAll(async () => {
    database = new CompletionDatabase();
    await database.initialize();
  }, 30000);
  afterAll(async () => {
    await database?.close();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    nativeSdk.getNativeSourceIdentity.mockReturnValue(NATIVE_SOURCE_FIXTURE);
    await database.seed();
    await seedAwsScanEvidence({ database });
    await database.client.evidenceAutomation.updateMany({
      data: { isEnabled: false },
    });
    beforeWrite = () => Promise.resolve();
    bindCompletionDatabase({
      client: database.client,
      beforeWrite: () => beforeWrite(),
    });
  });
  async function complete(
    overrides: { connectionId?: string; runId?: string } = {},
  ) {
    return autoSatisfyAwsTasks({
      organizationId: ORG,
      connectionId: 'connection',
      runId: 'current-run',
      ...overrides,
    });
  }
  it('accepts a current bound shared scan without inventing a task ID or custom run', async () => {
    expect(await complete()).toMatchObject({
      count: 1,
      passingServices: ['kms'],
    });
    const scan = await database.client.integrationCheckRun.findUniqueOrThrow({
      where: { id: 'current-run' },
    });
    expect(scan.taskId).toBeNull();
  });
  it('rejects a direct AWS completion call without a stored scan reference', async () => {
    expect(
      await completeTaskAutomatically({
        organizationId: ORG,
        taskId: TASK,
        source: 'aws',
      }),
    ).toEqual({ count: 0 });
  });
  it.each([{ runId: 'missing' }, { connectionId: 'other-account' }])(
    'rejects a wrong reference %j',
    async (reference) => {
      expect(await complete(reference)).toMatchObject({ count: 0 });
    },
  );
  it('does not use another account run even if that account is configured', async () => {
    await seedAwsScanEvidence({
      database,
      connectionId: 'other',
      runId: 'other-run',
    });
    expect(await complete({ runId: 'other-run' })).toMatchObject({ count: 0 });
  });
  it('does not let one account pass mask another configured AWS account failure', async () => {
    await seedAwsScanEvidence({
      database,
      connectionId: 'other',
      runId: 'other-run',
    });
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckResult"
      SET passed=false WHERE "checkRunId"='other-run'`;
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckRun"
      SET "passedCount"=0,"failedCount"=1 WHERE id='other-run'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('permits two current bound accounts when both pass', async () => {
    await seedAwsScanEvidence({
      database,
      connectionId: 'other',
      runId: 'other-run',
    });
    expect(await complete()).toMatchObject({ count: 1 });
  });
  it('does not let one account pass mask missing shared evidence on another configured AWS account', async () => {
    await seedAwsScanEvidence({
      database,
      connectionId: 'other',
      runId: 'other-run',
    });
    await database.admin
      .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckResult" WHERE "checkRunId"='other-run'`;
    await database.admin
      .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckRun" WHERE id='other-run'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it.each(['paused', 'disconnected'] as const)(
    'preserves the explicit %s account exclusion',
    async (status) => {
      await seedAwsScanEvidence({
        database,
        connectionId: 'other',
        runId: 'other-run',
      });
      await database.admin
        .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckResult" WHERE "checkRunId"='other-run'`;
      await database.admin
        .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckRun" WHERE id='other-run'`;
      await database.admin
        .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET status=${status}::${database.namespace}."IntegrationConnectionStatus" WHERE id='other'`;
      expect(await complete()).toMatchObject({ count: 1 });
    },
  );
  it.each([
    'pending',
    'running',
    'failed',
    'inconclusive',
    'cancelled',
  ] as const)(
    'does not hide a newer %s shared attempt behind old green',
    async (status) => {
      await database.admin
        .$executeRaw`INSERT INTO ${database.namespace}."IntegrationCheckRun"
        (id,"connectionId","checkId",status,"createdAt") VALUES
        ('newer','connection','aws-security-scan',${status}::${database.namespace}."IntegrationRunStatus",${new Date(NOW.getTime() + 1)})`;
      expect(await complete()).toMatchObject({ count: 0 });
    },
  );
  it('rejects missing source provenance without hiding successful collection', async () => {
    nativeSdk.getNativeSourceIdentity.mockReturnValue(null);
    expect(await complete()).toMatchObject({ count: 0 });
    expect(
      (
        await database.client.integrationCheckRun.findUniqueOrThrow({
          where: { id: 'current-run' },
        })
      ).status,
    ).toBe('success');
  });
  it('rejects historical unbound shared evidence', async () => {
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckRun"
      SET "completionEvidenceBinding"=NULL WHERE id='current-run'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('rejects scope edited before admission', async () => {
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET variables='{"regions":["new-region"]}' WHERE id='connection'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('rejects scan mode edited before admission', async () => {
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET metadata='{"awsScanMode":"security_hub"}' WHERE id='connection'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('rejects credentials rotated before admission', async () => {
    await database.admin
      .$executeRaw`INSERT INTO ${database.namespace}."IntegrationCredentialVersion"
      (id,"connectionId",version) VALUES ('rotated','connection',2)`;
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET "activeCredentialVersionId"='rotated' WHERE id='connection'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('rejects missing rows even when stored counts claim a complete pass', async () => {
    await database.admin
      .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckResult" WHERE "checkRunId"='current-run'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('retains a real failed stored resource and its mapped task', async () => {
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckResult"
      SET passed=false WHERE "checkRunId"='current-run'`;
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckRun"
      SET "passedCount"=0,"failedCount"=1 WHERE id='current-run'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('does not trust a fabricated scanned-services summary', async () => {
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckRun"
      SET "scannedServices"=ARRAY['kms','s3'] WHERE id='current-run'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('rejects a stored engine label that differs from the bound execution configuration', async () => {
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckRun"
      SET "scanMode"='security_hub' WHERE id='current-run'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('rejects configuration changed during collection before the final write', async () => {
    beforeWrite = () => database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET variables='{"enabledServices":["s3"]}' WHERE id='connection'`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
  it('rejects a newer pending scan inserted before the final write', async () => {
    beforeWrite = () => database.admin
      .$executeRaw`INSERT INTO ${database.namespace}."IntegrationCheckRun"
      (id,"connectionId","checkId",status,"createdAt") VALUES
      ('newer','connection','aws-security-scan','pending',${new Date(NOW.getTime() + 1)})`;
    expect(await complete()).toMatchObject({ count: 0 });
  });
});

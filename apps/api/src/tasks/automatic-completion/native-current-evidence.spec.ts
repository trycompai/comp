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
jest.mock(
  '@trycompai/integration-platform',
  () =>
    jest.requireActual('../../../test/fixtures/native-completion-sdk')
      .nativeSdk,
);

import {
  CompletionDatabase,
  ORG,
  TASK,
} from '../../../test/fixtures/aws-task-completion-db';
import { NOW } from '../../../test/fixtures/aws-task-completion-data';
import { bindCompletionDatabase } from '../../../test/fixtures/native-completion-mocks';
import { seedNativeCompletionEvidence } from '../../../test/fixtures/native-completion-data';
import {
  nativeSdk,
  NATIVE_SOURCE_FIXTURE,
} from '../../../test/fixtures/native-completion-sdk';
import { completeTaskAutomatically } from './complete-task-automatically';

describe('actual PostgreSQL current native evidence', () => {
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
    nativeSdk.isCodeManifest.mockReturnValue(true);
    await database.seed();
    await seedNativeCompletionEvidence({ database });
    beforeWrite = () => Promise.resolve();
    bindCompletionDatabase({
      client: database.client,
      beforeWrite: () => beforeWrite(),
    });
  });

  async function complete() {
    return completeTaskAutomatically({
      taskId: TASK,
      organizationId: ORG,
      source: 'native',
    });
  }

  it('applies the nullable native migration without a historical backfill', () => {
    expect(database.historicalNativeSnapshot).toBeNull();
  });
  it('accepts a known bound synthetic configuration through real SQL', async () => {
    expect(await complete()).toEqual({ count: 1 });
  });
  it('does not qualify a historical unbound run', async () => {
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckRun"
      SET "completionEvidenceBinding"=NULL WHERE id='current-run'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects repository scope 35 to 36 changed before admission', async () => {
    const repositories = Array.from(
      { length: 35 },
      (_, index) => `repo-${index}`,
    );
    await database.seed();
    await seedNativeCompletionEvidence({
      database,
      variables: { repositories },
    });
    repositories.push('repo-35');
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET variables=${JSON.stringify({ repositories })}::jsonb WHERE id='connection'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects current executable source changed before admission', async () => {
    nativeSdk.getNativeSourceIdentity.mockReturnValue('b'.repeat(64));
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects unavailable current runtime identity', async () => {
    nativeSdk.getNativeSourceIdentity.mockReturnValue(null);
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects credential revision changed before admission', async () => {
    await database.admin
      .$executeRaw`INSERT INTO ${database.namespace}."IntegrationCredentialVersion"
      (id,"connectionId",version) VALUES ('new-revision','connection',2)`;
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET "activeCredentialVersionId"='new-revision' WHERE id='connection'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('honors the exact fallback revision selected by the existing vault', async () => {
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET "activeCredentialVersionId"=NULL WHERE id='connection'`;
    expect(await complete()).toEqual({ count: 1 });
  });
  it.each([
    'pending',
    'running',
    'inconclusive',
    'cancelled',
    'failed',
  ] as const)(
    'does not fall back to older green after the latest %s attempt',
    async (status) => {
      await database.admin
        .$executeRaw`INSERT INTO ${database.namespace}."IntegrationCheckRun"
        (id,"connectionId","taskId","checkId",status,"createdAt")
        VALUES ('newest','connection',${TASK},'synthetic-check',${status}::${database.namespace}."IntegrationRunStatus",${new Date(NOW.getTime() + 1)})`;
      expect(await complete()).toEqual({ count: 0 });
    },
  );
  it('does not let a passing account mask another account failure', async () => {
    await seedNativeCompletionEvidence({
      database,
      connectionId: 'other',
      runId: 'other-run',
    });
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckRun"
      SET status='failed',"passedCount"=0,"failedCount"=1 WHERE id='other-run'`;
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckResult"
      SET passed=false WHERE "checkRunId"='other-run'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('retains a configured account with missing run evidence', async () => {
    await seedNativeCompletionEvidence({
      database,
      connectionId: 'other',
      runId: 'other-run',
    });
    await database.admin
      .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckResult"
      WHERE "checkRunId"='other-run'`;
    await database.admin
      .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckRun" WHERE id='other-run'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('keeps incomplete result rows unknown', async () => {
    await database.admin
      .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckResult"
      WHERE "checkRunId"='current-run'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('does not turn a zero-resource run into success', async () => {
    await database.admin
      .$executeRaw`DELETE FROM ${database.namespace}."IntegrationCheckResult"
      WHERE "checkRunId"='current-run'`;
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationCheckRun"
      SET "totalChecked"=0,"passedCount"=0 WHERE id='current-run'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects a newer pending run before the actual conditional write', async () => {
    beforeWrite = () => database.admin
      .$executeRaw`INSERT INTO ${database.namespace}."IntegrationCheckRun"
      (id,"connectionId","taskId","checkId",status,"createdAt")
      VALUES ('newest','connection',${TASK},'synthetic-check','pending',${new Date(NOW.getTime() + 1)})`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects a configuration change before the actual conditional write', async () => {
    beforeWrite = () => database.admin
      .$executeRaw`UPDATE ${database.namespace}."IntegrationConnection"
      SET variables='{"repositories":["added-repository"]}' WHERE id='connection'`;
    expect(await complete()).toEqual({ count: 0 });
  });
});

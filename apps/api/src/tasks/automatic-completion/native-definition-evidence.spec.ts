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
import { seedNativeCompletionEvidence } from '../../../test/fixtures/native-completion-data';
import { bindCompletionDatabase } from '../../../test/fixtures/native-completion-mocks';
import {
  nativeSdk,
  NATIVE_SOURCE_FIXTURE,
  NATIVE_TEMPLATE,
} from '../../../test/fixtures/native-completion-sdk';
import { completeTaskAutomatically } from './complete-task-automatically';

describe('actual PostgreSQL definition and exception evidence', () => {
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
  async function dynamic() {
    nativeSdk.isCodeManifest.mockReturnValue(false);
    const n = database.namespace;
    await database.admin.$executeRaw`INSERT INTO ${n}."DynamicIntegration"
      (id,slug,"isActive","updatedAt") VALUES ('dynamic','aws',true,${NOW})`;
    await database.admin.$executeRaw`INSERT INTO ${n}."DynamicCheck"
      (id,"integrationId","checkSlug","isEnabled","taskMapping","updatedAt")
      VALUES ('definition','dynamic','synthetic-check',true,${NATIVE_TEMPLATE},${NOW})`;
    const definitionIdentity = nativeSdk.declarativeDefinitionIdentity({
      id: 'synthetic-check',
      name: 'Synthetic check',
      description: 'Synthetic metadata',
      definition: { steps: [] },
      taskMapping: NATIVE_TEMPLATE,
    });
    const manifestIdentity = nativeSdk.dynamicManifestIdentity({
      slug: 'aws',
      authConfig: { type: 'api_key', config: { name: 'api_key' } },
      baseUrl: null,
      defaultHeaders: null,
      syncDefinition: null,
      services: null,
    });
    const binding = nativeSdk.createNativeCompletionBinding({
      sourceIdentity: NATIVE_SOURCE_FIXTURE,
      definitionIdentity,
      manifestIdentity,
      organizationId: ORG,
      connectionId: 'connection',
      checkId: 'synthetic-check',
      context: {
        taskId: TASK,
        credentialRevision: 'connection-revision-1',
        configurationMetadata: {},
      },
      variables: {},
    });
    expect(binding).not.toBeNull();
    await database.admin.$executeRaw`UPDATE ${n}."IntegrationCheckRun"
      SET "completionEvidenceBinding"=${binding} WHERE id='current-run'`;
  }
  it('accepts the exact executed declarative definition and parent manifest', async () => {
    await dynamic();
    expect(await complete()).toEqual({ count: 1 });
  });
  it('rejects a declarative source edit made before admission', async () => {
    await dynamic();
    await database.admin.$executeRaw`UPDATE ${database.namespace}."DynamicCheck"
      SET definition='{"steps":[{"type":"code","code":"new source"}]}' WHERE id='definition'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects a parent manifest edit made before admission', async () => {
    await dynamic();
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."DynamicIntegration"
      SET "baseUrl"='https://synthetic.invalid/new' WHERE id='dynamic'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects a newly enabled mapped check without its own current evidence', async () => {
    await dynamic();
    await database.admin
      .$executeRaw`INSERT INTO ${database.namespace}."DynamicCheck"
      (id,"integrationId","checkSlug","isEnabled","taskMapping","updatedAt")
      VALUES ('added','dynamic','new-check',true,${NATIVE_TEMPLATE},${NOW})`;
    expect(await complete()).toEqual({ count: 0 });
  });
  async function exceptFailure() {
    const n = database.namespace;
    await database.admin.$executeRaw`UPDATE ${n}."IntegrationCheckResult"
      SET passed=false WHERE "checkRunId"='current-run'`;
    await database.admin.$executeRaw`UPDATE ${n}."IntegrationCheckRun"
      SET status='failed',"passedCount"=0,"failedCount"=1 WHERE id='current-run'`;
    await database.admin.$executeRaw`INSERT INTO ${n}."FindingException"
      (id,"organizationId","connectionId","checkId","resourceId",reason)
      VALUES ('exception',${ORG},'connection','synthetic-check','passing-resource','Explicit synthetic exception')`;
  }
  it('preserves the existing active finding-exception path with raw failures retained', async () => {
    await exceptFailure();
    expect(await complete()).toEqual({ count: 1 });
    expect(
      await database.client.integrationCheckResult.count({
        where: { passed: false },
      }),
    ).toBe(1);
  });
  it('rejects a used exception revoked before the conditional write', async () => {
    await exceptFailure();
    beforeWrite = () => database.admin
      .$executeRaw`UPDATE ${database.namespace}."FindingException"
      SET "revokedAt"=now() WHERE id='exception'`;
    expect(await complete()).toEqual({ count: 0 });
  });
  it('rejects an expired exception', async () => {
    await exceptFailure();
    await database.admin
      .$executeRaw`UPDATE ${database.namespace}."FindingException"
      SET "expiresAt"=${NOW} WHERE id='exception'`;
    expect(await complete()).toEqual({ count: 0 });
  });
});

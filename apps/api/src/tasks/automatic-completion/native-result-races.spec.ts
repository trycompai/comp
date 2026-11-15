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

import { setTimeout as pause } from 'node:timers/promises';
import {
  CompletionDatabase,
  ORG,
  TASK,
} from '../../../test/fixtures/aws-task-completion-db';
import { seedNativeCompletionEvidence } from '../../../test/fixtures/native-completion-data';
import { seedAwsScanEvidence } from '../../../test/fixtures/aws-scan-data';
import {
  nativeSdk,
  NATIVE_TEMPLATE,
} from '../../../test/fixtures/native-completion-sdk';
import { bindCompletionDatabase } from '../../../test/fixtures/native-completion-mocks';
import { completeTaskAutomatically } from './complete-task-automatically';

describe.each(['native', 'aws'] as const)(
  'actual PostgreSQL result completeness at %s completion',
  (source) => {
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
      await database.seed();
      beforeWrite = () => Promise.resolve();
      bindCompletionDatabase({
        client: database.client,
        beforeWrite: () => beforeWrite(),
      });
      nativeSdk.getManifest.mockReturnValue({
        id: 'aws',
        checks:
          source === 'native'
            ? [{ id: 'synthetic-check', taskMapping: NATIVE_TEMPLATE }]
            : [],
      });
      if (source === 'native') await seedNativeCompletionEvidence({ database });
      else await seedAwsScanEvidence({ database });
      const n = database.namespace;
      await database.admin.$executeRaw`INSERT INTO ${n}."FindingException"
      (id,"organizationId","connectionId","checkId","resourceId",reason)
      VALUES ('unused-exception',${ORG},'connection','synthetic-check','excepted-resource','Owned synthetic exception')`;
    });

    it('permits an unchanged complete native run', async () => {
      expect(
        await completeTaskAutomatically({
          taskId: TASK,
          organizationId: ORG,
          source,
          ...(source === 'aws'
            ? { awsScan: { connectionId: 'connection', runId: 'current-run' } }
            : {}),
        }),
      ).toEqual({ count: 1 });
    });

    it.each(['delete-pass', 'insert-failure-and-revoke'] as const)(
      'serializes %s or rejects when the mutation commits before completion',
      async (operation) => {
        let announceWrite: () => void = () => undefined;
        let releaseWrite: () => void = () => undefined;
        const atWrite = new Promise<void>((resolve) => {
          announceWrite = resolve;
        });
        const released = new Promise<void>((resolve) => {
          releaseWrite = resolve;
        });
        beforeWrite = async () => {
          announceWrite();
          await released;
        };
        const completion = completeTaskAutomatically({
          taskId: TASK,
          organizationId: ORG,
          source,
          ...(source === 'aws'
            ? { awsScan: { connectionId: 'connection', runId: 'current-run' } }
            : {}),
        });
        const admissionTimeout = new AbortController();
        try {
          await Promise.race([
            atWrite,
            pause(3000, undefined, { signal: admissionTimeout.signal }).then(
              () => {
                throw new Error('Completion never reached its write');
              },
            ),
          ]);
        } finally {
          admissionTimeout.abort();
        }
        let mutationCommitted = false;
        let taskStatusAtMutation: string | undefined;
        const mutation = database.admin
          .$transaction(async (transaction) => {
            const n = database.namespace;
            if (operation === 'delete-pass') {
              await transaction.$executeRaw`DELETE FROM ${n}."IntegrationCheckResult" WHERE id='current-run-pass'`;
            } else {
              await transaction.$executeRaw`INSERT INTO ${n}."IntegrationCheckResult"
            (id,"checkRunId",passed,"resourceId")
            VALUES ('new-failure','current-run',false,'excepted-resource')`;
              await transaction.$executeRaw`UPDATE ${n}."FindingException"
            SET "revokedAt"=now() WHERE id='unused-exception'`;
            }
            const tasks = await transaction.$queryRaw<
              Array<{ status: string }>
            >`SELECT status FROM ${n}."Task" WHERE id=${TASK}`;
            taskStatusAtMutation = tasks[0]?.status;
          })
          .then(() => {
            mutationCommitted = true;
          });
        let observedLock = false;
        try {
          const deadline = Date.now() + 1000;
          while (!mutationCommitted && Date.now() < deadline) {
            const rows = await database.admin.$queryRaw<
              Array<{ blocked: number }>
            >`SELECT count(*)::int AS blocked FROM pg_stat_activity
             WHERE datname=current_database() AND pid<>pg_backend_pid()
               AND wait_event_type='Lock'`;
            if (rows[0]?.blocked > 0) {
              observedLock = true;
              break;
            }
            await pause(10);
          }
          if (!mutationCommitted && !observedLock) {
            throw new Error(
              'Mutation neither committed nor showed an actual bounded PostgreSQL lock',
            );
          }
        } finally {
          releaseWrite();
        }
        const result = await completion;
        await mutation;
        if (taskStatusAtMutation === 'failed') {
          // Mutation committed first. Stale counts must never authorize Done.
          expect(result.count).toBe(0);
        } else {
          // Parent/result locks can instead serialize completion first. The
          // mutation then sees Done only after that transaction has committed.
          expect(observedLock).toBe(true);
          expect(taskStatusAtMutation).toBe('done');
          expect(result.count).toBe(1);
        }
      },
    );
  },
);

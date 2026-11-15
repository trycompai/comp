import { db, Prisma } from '@db';
import { isCodeManifest } from '@trycompai/integration-platform';
import type { AwsScanReference } from '../../cloud-security/aws-scan-evidence';
import { awsTaskScanScope } from '../../cloud-security/aws-task-scan-scope';
import { nativeCompletionEvidence } from './native-completion-evidence';
import {
  loadCompletionConnections,
  type CompletionClient,
  type CompletionConnection,
} from './native-completion-inventory';
import {
  canAutoCompleteTask,
  completionSelect,
  taskCompletionSnapshot,
  type CompletionCandidate,
} from './task-completion-policy';

type CompletionSource = 'aws' | 'native' | 'browser' | 'disconnect';

export async function completeTaskAutomatically({
  taskId,
  organizationId,
  source,
  awsScan,
}: {
  taskId: string;
  organizationId: string;
  source: CompletionSource;
  awsScan?: AwsScanReference;
}): Promise<{ count: number }> {
  const task = await db.task.findUnique({
    where: { id: taskId, organizationId },
    select: completionSelect,
  });
  if (!task) return { count: 0 };
  return completeAdmittedTask({ task, organizationId, source, awsScan });
}

export async function completeAdmittedTask({
  task,
  organizationId,
  source,
  awsScan,
}: {
  task: CompletionCandidate;
  organizationId: string;
  source: CompletionSource;
  awsScan?: AwsScanReference;
}): Promise<{ count: number }> {
  if (!canAutoCompleteTask(task)) return { count: 0 };
  const connections = await loadCompletionConnections({ organizationId });
  const dynamicSlugs = connections
    .filter((connection) => !isCodeManifest(connection.provider.slug))
    .map((connection) => connection.provider.slug);
  if (connections.length === 0) {
    return writeCompletion({
      task,
      organizationId,
      source,
      awsScan,
      connections,
      client: db,
    });
  }
  return db.$transaction(async (client) => {
    // Lock definitions while deciding. Parent UPDATE locks also block new
    // checks' FK insertion; SHARE locks protect existing check edits/deletes.
    // This keeps a newly enabled check from slipping between inventory and CAS.
    if (dynamicSlugs.length > 0) {
      await client.$queryRaw(Prisma.sql`
        SELECT "id" FROM "DynamicIntegration"
        WHERE "slug" IN (${Prisma.join(dynamicSlugs)}) FOR UPDATE`);
      await client.$queryRaw(Prisma.sql`
        SELECT "id" FROM "DynamicCheck" WHERE "integrationId" IN (
          SELECT "id" FROM "DynamicIntegration"
          WHERE "slug" IN (${Prisma.join(dynamicSlugs)})
        ) FOR SHARE`);
    }
    return writeCompletion({
      task,
      organizationId,
      source,
      awsScan,
      connections,
      client,
    });
  });
}

async function writeCompletion({
  task,
  organizationId,
  source,
  awsScan,
  connections,
  client,
}: {
  task: CompletionCandidate;
  organizationId: string;
  source: CompletionSource;
  awsScan?: AwsScanReference;
  connections: CompletionConnection[];
  client: CompletionClient;
}) {
  const scan =
    source === 'aws' && awsScan
      ? await awsTaskScanScope({
          organizationId,
          taskTemplateId: task.taskTemplateId,
          reference: awsScan,
          connections,
          client,
        })
      : null;
  if (source === 'aws' && !scan) {
    return { count: 0 };
  }
  const native = await nativeCompletionEvidence({
    taskId: task.id,
    taskTemplateId: task.taskTemplateId,
    organizationId,
    connections,
    client,
  });
  if (
    !native ||
    (source === 'native' && native.checks === 0) ||
    (source === 'disconnect' &&
      native.checks === 0 &&
      task.evidenceAutomations.length === 0)
  ) {
    return { count: 0 };
  }
  const now = new Date();
  const original = taskCompletionSnapshot({ task, organizationId });
  const existing = original.AND
    ? Array.isArray(original.AND)
      ? original.AND
      : [original.AND]
    : [];
  const exceptionConditions: Prisma.TaskWhereInput[] = native.exceptions.map(
    (exception) => ({
      organization: {
        findingExceptions: {
          some: {
            ...exception,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
    }),
  );
  let reviewDate: Date | undefined;
  if (source === 'native' || source === 'browser') {
    if (task.frequency) {
      reviewDate = new Date(now);
      const months =
        task.frequency === 'monthly'
          ? 1
          : task.frequency === 'quarterly'
            ? 3
            : task.frequency === 'yearly'
              ? 12
              : 0;
      if (months) reviewDate.setMonth(reviewDate.getMonth() + months);
    }
  }
  return client.task.updateMany({
    where: {
      ...original,
      taskTemplateId: task.taskTemplateId,
      AND: [
        ...existing,
        ...native.conditions,
        ...exceptionConditions,
        ...(scan?.conditions ?? []),
      ],
    },
    data: {
      status: 'done',
      ...(source === 'aws' ? { lastCompletedAt: now } : {}),
      ...(reviewDate ? { reviewDate } : {}),
    },
  });
}

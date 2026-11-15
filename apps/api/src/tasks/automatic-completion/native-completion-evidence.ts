import { Prisma } from '@db';
import {
  createNativeCompletionBinding,
  getNativeSourceIdentity,
} from '@trycompai/integration-platform';
import { loadActiveExceptionSet } from '../../cloud-security/finding-exceptions';
import {
  expectedNativeChecks,
  selectedCredentialRevision,
  type CompletionClient,
  type CompletionConnection,
} from './native-completion-inventory';

function jsonSnapshot(value: Prisma.JsonValue): Prisma.JsonNullableFilter {
  return {
    equals: value === null ? Prisma.AnyNull : value,
  };
}

export async function nativeCompletionEvidence({
  taskId,
  taskTemplateId,
  organizationId,
  connections,
  client,
}: {
  taskId: string;
  taskTemplateId: string | null;
  organizationId: string;
  connections: CompletionConnection[];
  client: CompletionClient;
}): Promise<{
  conditions: Prisma.TaskWhereInput[];
  exceptions: Array<{
    id: string;
    connectionId: string;
    checkId: string;
    resourceId: string;
  }>;
  checks: number;
} | null> {
  const expected = await expectedNativeChecks({
    taskId,
    taskTemplateId,
    connections,
    client,
  });
  if (!expected) return null;
  const usedExceptions: Array<{
    id: string;
    connectionId: string;
    checkId: string;
    resourceId: string;
  }> = [];
  const conditions: Prisma.TaskWhereInput[] = [
    {
      organization: {
        integrationConnections: {
          none: {
            status: { notIn: ['disconnected', 'paused'] },
            provider: { isActive: true },
            id: { notIn: connections.map((connection) => connection.id) },
          },
        },
      },
    },
  ];
  for (const connection of connections) {
    conditions.push({
      organization: {
        integrationConnections: {
          some: {
            id: connection.id,
            providerId: connection.providerId,
            status: connection.status,
            activeCredentialVersionId: connection.activeCredentialVersionId,
            credentialVersions: connection.activeCredentialVersionId
              ? { some: { id: connection.activeCredentialVersionId } }
              : connection.credentialVersions[0]
                ? {
                    some: connection.credentialVersions[0],
                    none: {
                      version: { gt: connection.credentialVersions[0].version },
                    },
                  }
                : { none: {} },
            metadata: jsonSnapshot(connection.metadata),
            variables: jsonSnapshot(connection.variables),
            provider: connection.provider,
          },
        },
      },
    });
  }
  const exceptions = expected.length
    ? await loadActiveExceptionSet(organizationId)
    : null;
  for (const {
    connection,
    checkId,
    definitionIdentity,
    manifestIdentity,
  } of expected) {
    if (connection.status !== 'active') return null;
    // This is an evidence decision, not the display history: never hide held,
    // pending, running, cancelled or errored attempts behind an older green.
    const runQuery = {
      where: { taskId, connectionId: connection.id, checkId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        createdAt: true,
        status: true,
        startedAt: true,
        completedAt: true,
        totalChecked: true,
        passedCount: true,
        failedCount: true,
        errorMessage: true,
        completionEvidenceBinding: true,
      },
    } satisfies Prisma.IntegrationCheckRunFindFirstArgs;
    const admitted = await client.integrationCheckRun.findFirst(runQuery);
    if (!admitted) return null;
    // The parent UPDATE lock blocks new result inserts through their FK. SHARE
    // locks keep existing rows from being edited/deleted after the counts.
    // Re-read after lock acquisition: a change before the lock must win.
    await client.$queryRaw`SELECT "id" FROM "IntegrationCheckRun"
      WHERE "id"=${admitted.id} FOR UPDATE`;
    await client.$queryRaw`SELECT "id" FROM "IntegrationCheckResult"
      WHERE "checkRunId"=${admitted.id} FOR SHARE`;
    const run = await client.integrationCheckRun.findFirst(runQuery);
    const expectedBinding = createNativeCompletionBinding({
      sourceIdentity: getNativeSourceIdentity(),
      definitionIdentity,
      manifestIdentity,
      organizationId,
      connectionId: connection.id,
      checkId,
      context: {
        taskId,
        credentialRevision: selectedCredentialRevision(connection),
        configurationMetadata: connection.metadata,
      },
      variables: connection.variables || {},
    });
    if (
      !run ||
      run.id !== admitted.id ||
      !['success', 'failed'].includes(run.status) ||
      !run.startedAt ||
      !run.completedAt ||
      !expectedBinding ||
      run.completionEvidenceBinding !== expectedBinding ||
      run.completedAt < run.startedAt ||
      !!run.errorMessage ||
      ![run.totalChecked, run.passedCount, run.failedCount].every(
        (count) => Number.isInteger(count) && count >= 0,
      ) ||
      run.totalChecked === 0 ||
      run.totalChecked !== run.passedCount + run.failedCount
    ) {
      return null;
    }
    const excepted =
      exceptions?.exceptedResourceIds(connection.id, checkId) ?? [];
    const failedWhere = {
      passed: false,
      resourceId: { notIn: excepted },
    } satisfies Prisma.IntegrationCheckResultWhereInput;
    const [total, failed, effectiveFailures] = await Promise.all([
      client.integrationCheckResult.count({ where: { checkRunId: run.id } }),
      client.integrationCheckResult.count({
        where: { checkRunId: run.id, passed: false },
      }),
      client.integrationCheckResult.count({
        where: { checkRunId: run.id, ...failedWhere },
      }),
    ]);
    if (
      total !== run.totalChecked ||
      failed !== run.failedCount ||
      effectiveFailures !== 0
    ) {
      return null;
    }
    const usedResources = run.failedCount
      ? await client.integrationCheckResult.findMany({
          where: {
            checkRunId: run.id,
            passed: false,
            resourceId: { in: excepted },
          },
          select: { resourceId: true },
          distinct: ['resourceId'],
        })
      : [];
    for (const { resourceId } of usedResources) {
      const exception = exceptions?.infoFor(connection.id, checkId, resourceId);
      if (!exception) return null;
      usedExceptions.push({
        id: exception.id,
        connectionId: connection.id,
        checkId,
        resourceId,
      });
    }
    conditions.push({
      integrationCheckRuns: {
        some: {
          ...run,
          connectionId: connection.id,
          checkId,
          results: { none: failedWhere },
        },
        none: {
          connectionId: connection.id,
          checkId,
          OR: [
            { createdAt: { gt: run.createdAt } },
            { createdAt: run.createdAt, id: { gt: run.id } },
          ],
        },
      },
    });
  }
  return { conditions, exceptions: usedExceptions, checks: expected.length };
}

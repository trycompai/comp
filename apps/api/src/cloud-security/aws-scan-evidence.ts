import { db, type Prisma } from '@db';
import { getNativeSourceIdentity } from '@trycompai/integration-platform';
import {
  loadCompletionConnections,
  selectedCredentialRevision,
  type CompletionClient,
  type CompletionConnection,
} from '../tasks/automatic-completion/native-completion-inventory';
import { awsConfiguredScanMode, awsScanBinding } from './aws-scan-binding';
import { AWS_SERVICE_TASK_MAPPINGS } from './aws-task-mappings';

export interface AwsScanReference {
  connectionId: string;
  runId: string;
}

export function passingAwsTemplates(
  rows: Array<{ passed: boolean; evidence: Prisma.JsonValue }>,
) {
  const byService = new Map<string, boolean[]>();
  for (const row of rows) {
    const evidence = row.evidence;
    const service =
      evidence && typeof evidence === 'object' && !Array.isArray(evidence)
        ? evidence.serviceId
        : null;
    if (typeof service !== 'string' || !service) continue;
    const results = byService.get(service) ?? [];
    results.push(row.passed === true);
    byService.set(service, results);
  }
  const passingServices = [...byService.entries()]
    .filter(([, results]) => results.every(Boolean))
    .map(([service]) => service);
  const templates = new Set(
    passingServices.flatMap(
      (service) => AWS_SERVICE_TASK_MAPPINGS[service] ?? [],
    ),
  );
  const eligibleTemplateIds = [...templates].filter((template) =>
    Object.entries(AWS_SERVICE_TASK_MAPPINGS)
      .filter(
        ([service, mapped]) =>
          mapped.includes(template) && byService.has(service),
      )
      .every(([service]) => passingServices.includes(service)),
  );
  return {
    passingServices,
    eligibleTemplateIds,
    scannedServices: [...byService.keys()].sort(),
  };
}

/** Stored shared scans remain task-agnostic; only a verified current run can qualify a task. */
export async function awsScanEvidence({
  organizationId,
  reference,
  client = db,
  connections,
  lock = false,
}: {
  organizationId: string;
  reference: AwsScanReference;
  client?: CompletionClient;
  connections?: CompletionConnection[];
  lock?: boolean;
}) {
  const inventory =
    connections ??
    (await loadCompletionConnections({ organizationId, client }));
  const connection = inventory.find(
    (entry) => entry.id === reference.connectionId,
  );
  if (
    !connection ||
    connection.status !== 'active' ||
    connection.provider.slug !== 'aws'
  )
    return null;
  const query = {
    where: {
      connectionId: connection.id,
      checkId: 'aws-security-scan',
      taskId: null,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  } satisfies Prisma.IntegrationCheckRunFindFirstArgs;
  const admitted = await client.integrationCheckRun.findFirst(query);
  if (!admitted || admitted.id !== reference.runId) return null;
  if (lock) {
    await client.$queryRaw`SELECT "id" FROM "IntegrationCheckRun"
      WHERE "id"=${admitted.id} FOR UPDATE`;
    await client.$queryRaw`SELECT "id" FROM "IntegrationCheckResult"
      WHERE "checkRunId"=${admitted.id} FOR SHARE`;
  }
  const run = lock
    ? await client.integrationCheckRun.findFirst(query)
    : admitted;
  if (
    !run ||
    run.id !== reference.runId ||
    run.status !== 'success' ||
    run.scanMode !== awsConfiguredScanMode(connection) ||
    !run.startedAt ||
    !run.completedAt ||
    run.completedAt < run.startedAt ||
    run.errorMessage ||
    !run.completionEvidenceBinding ||
    ![run.totalChecked, run.passedCount, run.failedCount].every(
      (count) => Number.isInteger(count) && count >= 0,
    ) ||
    run.totalChecked === 0 ||
    run.totalChecked !== run.passedCount + run.failedCount
  )
    return null;
  const binding = awsScanBinding({
    connection,
    organizationId,
    runId: run.id,
    startedAt: run.startedAt,
    credentialRevision: selectedCredentialRevision(connection),
    sourceIdentity: getNativeSourceIdentity(),
  });
  if (!binding || binding !== run.completionEvidenceBinding) return null;
  const rows = await client.integrationCheckResult.findMany({
    where: { checkRunId: run.id },
    select: { passed: true, evidence: true },
  });
  if (
    rows.length !== run.totalChecked ||
    rows.filter((row) => !row.passed).length !== run.failedCount
  )
    return null;
  const passing = passingAwsTemplates(rows);
  if (
    JSON.stringify(passing.scannedServices) !==
    JSON.stringify([...run.scannedServices].sort())
  )
    return null;
  const condition: Prisma.TaskWhereInput = {
    organization: {
      integrationConnections: {
        some: {
          id: connection.id,
          checkRuns: {
            some: {
              id: run.id,
              taskId: null,
              checkId: run.checkId,
              status: 'success',
              startedAt: run.startedAt,
              completedAt: run.completedAt,
              completionEvidenceBinding: binding,
              totalChecked: run.totalChecked,
              passedCount: run.passedCount,
              failedCount: run.failedCount,
              errorMessage: run.errorMessage,
              scanMode: run.scanMode,
              scannedServices: { equals: run.scannedServices },
            },
            none: {
              taskId: null,
              checkId: run.checkId,
              OR: [
                { createdAt: { gt: run.createdAt } },
                { createdAt: run.createdAt, id: { gt: run.id } },
              ],
            },
          },
        },
      },
    },
  };
  return { ...passing, condition };
}

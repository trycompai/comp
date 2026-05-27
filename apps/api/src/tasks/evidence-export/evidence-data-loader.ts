import { NotFoundException } from '@nestjs/common';
import { db, AttachmentEntityType } from '@db';
import type {
  TaskEvidenceSummary,
  NormalizedAutomation,
  NormalizedEvidenceRun,
} from './evidence-export.types';
import {
  type AppAutomationRun,
  type CustomAutomationRun,
  normalizeAppAutomationRun,
  normalizeCustomAutomationRun,
  normalizeStatus,
} from './evidence-normalizer';

const RUN_BATCH_SIZE = 50;

interface AppRunHeader {
  checkId: string;
  checkName: string;
  status: string;
  failedCount: number;
  createdAt: Date;
  connection: { provider: { slug: string; name: string } | null };
}

interface CustomRunHeader {
  status: string;
  evaluationStatus: string | null;
  createdAt: Date;
  evidenceAutomation: { id: string; name: string };
}

function groupAppRunHeaders(runs: AppRunHeader[]): NormalizedAutomation[] {
  const grouped = new Map<string, NormalizedAutomation>();

  for (const run of runs) {
    const key = run.checkId;
    const status = normalizeStatus(run.status);

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: run.checkId,
        name: run.checkName,
        type: 'app_automation',
        integrationName: run.connection.provider?.name,
        checkId: run.checkId,
        runs: [],
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        latestRunAt: null,
      });
    }

    const automation = grouped.get(key)!;
    automation.totalRuns++;

    if (status === 'success' && run.failedCount === 0) {
      automation.successfulRuns++;
    } else if (status === 'failed' || run.failedCount > 0) {
      automation.failedRuns++;
    }

    if (!automation.latestRunAt || run.createdAt > automation.latestRunAt) {
      automation.latestRunAt = run.createdAt;
    }
  }

  return Array.from(grouped.values());
}

function groupCustomRunHeaders(
  runs: CustomRunHeader[],
): NormalizedAutomation[] {
  const grouped = new Map<string, NormalizedAutomation>();

  for (const run of runs) {
    const key = run.evidenceAutomation.id;
    const status = normalizeStatus(run.status);

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: run.evidenceAutomation.id,
        name: run.evidenceAutomation.name,
        type: 'custom_automation',
        runs: [],
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        latestRunAt: null,
      });
    }

    const automation = grouped.get(key)!;
    automation.totalRuns++;

    if (run.evaluationStatus === 'pass') {
      automation.successfulRuns++;
    } else if (run.evaluationStatus === 'fail' || status === 'failed') {
      automation.failedRuns++;
    }

    if (!automation.latestRunAt || run.createdAt > automation.latestRunAt) {
      automation.latestRunAt = run.createdAt;
    }
  }

  return Array.from(grouped.values());
}

// Lightweight metadata query — no run results or logs loaded.
export async function getAutomationHeaders({
  organizationId,
  taskId,
}: {
  organizationId: string;
  taskId: string;
}): Promise<TaskEvidenceSummary> {
  const task = await db.task.findFirst({
    where: { id: taskId, organizationId },
    include: { organization: { select: { name: true } } },
  });

  if (!task) {
    throw new NotFoundException('Task not found');
  }

  const HEADER_BATCH = 500;
  const appRuns: AppRunHeader[] = [];
  let appCursor: string | undefined;
  while (true) {
    const batch = await db.integrationCheckRun.findMany({
      where: { taskId },
      select: {
        id: true,
        checkId: true,
        checkName: true,
        status: true,
        failedCount: true,
        createdAt: true,
        connection: {
          select: { provider: { select: { slug: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: HEADER_BATCH,
      ...(appCursor ? { cursor: { id: appCursor }, skip: 1 } : {}),
    });
    appRuns.push(...batch);
    if (batch.length < HEADER_BATCH) break;
    appCursor = batch[batch.length - 1]!.id;
  }

  const customRuns: CustomRunHeader[] = [];
  let customCursor: string | undefined;
  while (true) {
    const batch = await db.evidenceAutomationRun.findMany({
      where: {
        evidenceAutomation: { taskId },
        version: { not: null },
      },
      select: {
        id: true,
        status: true,
        evaluationStatus: true,
        createdAt: true,
        evidenceAutomation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: HEADER_BATCH,
      ...(customCursor ? { cursor: { id: customCursor }, skip: 1 } : {}),
    });
    customRuns.push(...batch);
    if (batch.length < HEADER_BATCH) break;
    customCursor = batch[batch.length - 1]!.id;
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    organizationId,
    organizationName: task.organization.name,
    automations: [
      ...groupAppRunHeaders(appRuns),
      ...groupCustomRunHeaders(customRuns),
    ],
    exportedAt: new Date(),
  };
}

// Loads one automation's runs in batches to bound both JSON.parse and heap pressure.
export async function loadFullAutomation({
  taskId,
  header,
}: {
  taskId: string;
  header: NormalizedAutomation;
}): Promise<NormalizedAutomation> {
  const runs: NormalizedEvidenceRun[] = [];
  for await (const batch of streamAutomationRuns({ taskId, header })) {
    runs.push(...batch);
  }
  return { ...header, runs };
}

// Yields runs in batches so callers can process incrementally without
// accumulating all runs in memory. Each batch is GC-eligible after processing.
export async function* streamAutomationRuns({
  taskId,
  header,
}: {
  taskId: string;
  header: NormalizedAutomation;
}): AsyncGenerator<NormalizedEvidenceRun[]> {
  if (header.type === 'app_automation' && header.checkId) {
    yield* streamAppRuns(taskId, header.checkId);
  } else {
    yield* streamCustomRuns(taskId, header.id);
  }
}

async function* streamAppRuns(
  taskId: string,
  checkId: string,
): AsyncGenerator<NormalizedEvidenceRun[]> {
  let cursor: { id: string } | undefined;

  for (;;) {
    const batch = await db.integrationCheckRun.findMany({
      where: { taskId, checkId },
      include: {
        results: true,
        connection: { include: { provider: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: RUN_BATCH_SIZE,
      ...(cursor ? { cursor, skip: 1 } : {}),
    });

    if (batch.length === 0) break;

    yield batch.map((run) =>
      normalizeAppAutomationRun(toAppAutomationRun(run)),
    );

    if (batch.length < RUN_BATCH_SIZE) break;
    cursor = { id: batch[batch.length - 1].id };
  }
}

async function* streamCustomRuns(
  taskId: string,
  automationId: string,
): AsyncGenerator<NormalizedEvidenceRun[]> {
  let cursor: { id: string } | undefined;

  for (;;) {
    const batch = await db.evidenceAutomationRun.findMany({
      where: {
        evidenceAutomation: { id: automationId, taskId },
        version: { not: null },
      },
      include: {
        evidenceAutomation: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: RUN_BATCH_SIZE,
      ...(cursor ? { cursor, skip: 1 } : {}),
    });

    if (batch.length === 0) break;

    yield batch.map((run) =>
      normalizeCustomAutomationRun(toCustomAutomationRun(run)),
    );

    if (batch.length < RUN_BATCH_SIZE) break;
    cursor = { id: batch[batch.length - 1].id };
  }
}

// Prisma result → normalizer interface mappers (single source of truth).
function toAppAutomationRun(run: {
  id: string;
  checkId: string;
  checkName: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  errorMessage: string | null;
  logs: unknown;
  createdAt: Date;
  connection: { provider: { slug: string; name: string } | null };
  results: Array<{
    id: string;
    passed: boolean;
    resourceType: string;
    resourceId: string;
    title: string;
    description: string | null;
    severity: string | null;
    remediation: string | null;
    evidence: unknown;
    collectedAt: Date;
  }>;
}): AppAutomationRun {
  return {
    id: run.id,
    checkId: run.checkId,
    checkName: run.checkName,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    totalChecked: run.totalChecked,
    passedCount: run.passedCount,
    failedCount: run.failedCount,
    errorMessage: run.errorMessage,
    logs: run.logs,
    createdAt: run.createdAt,
    connection: {
      provider: run.connection.provider
        ? {
            slug: run.connection.provider.slug,
            name: run.connection.provider.name,
          }
        : undefined,
    },
    results: run.results.map((r) => ({
      id: r.id,
      passed: r.passed,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      title: r.title,
      description: r.description,
      severity: r.severity,
      remediation: r.remediation,
      evidence: r.evidence,
      collectedAt: r.collectedAt,
    })),
  };
}

function toCustomAutomationRun(run: {
  id: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  runDuration: number | null;
  success: boolean | null;
  error: string | null;
  logs: unknown;
  output: unknown;
  evaluationStatus: string | null;
  evaluationReason: string | null;
  createdAt: Date;
  evidenceAutomation: { id: string; name: string };
}): CustomAutomationRun {
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    runDuration: run.runDuration,
    success: run.success,
    error: run.error,
    logs: run.logs,
    output: run.output,
    evaluationStatus: run.evaluationStatus,
    evaluationReason: run.evaluationReason,
    createdAt: run.createdAt,
    evidenceAutomation: {
      id: run.evidenceAutomation.id,
      name: run.evidenceAutomation.name,
    },
  };
}

export async function findTasksWithEvidence(
  organizationId: string,
): Promise<string[]> {
  const [tasksWithRuns, taskAttachments] = await Promise.all([
    db.task.findMany({
      where: {
        organizationId,
        OR: [
          { integrationCheckRuns: { some: {} } },
          {
            evidenceAutomations: {
              some: { runs: { some: { version: { not: null } } } },
            },
          },
        ],
      },
      select: { id: true },
    }),
    db.attachment.findMany({
      where: {
        organizationId,
        entityType: AttachmentEntityType.task,
      },
      select: { entityId: true },
      distinct: ['entityId'],
    }),
  ]);

  const ids = new Set<string>();
  for (const t of tasksWithRuns) ids.add(t.id);
  for (const a of taskAttachments) ids.add(a.entityId);
  return Array.from(ids);
}

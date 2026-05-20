import { NotFoundException } from '@nestjs/common';
import { db, AttachmentEntityType } from '@db';
import type {
  TaskEvidenceSummary,
  NormalizedAutomation,
} from './evidence-export.types';
import {
  normalizeAppAutomationRun,
  normalizeCustomAutomationRun,
  normalizeStatus,
} from './evidence-normalizer';

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

function groupCustomRunHeaders(runs: CustomRunHeader[]): NormalizedAutomation[] {
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

  const [appRuns, customRuns] = await Promise.all([
    db.integrationCheckRun.findMany({
      where: { taskId },
      select: {
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
    }),
    db.evidenceAutomationRun.findMany({
      where: {
        evidenceAutomation: { taskId },
        version: { not: null },
      },
      select: {
        status: true,
        evaluationStatus: true,
        createdAt: true,
        evidenceAutomation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

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

// Loads one automation's runs with full results/logs — called per-automation to bound memory.
export async function loadFullAutomation({
  taskId,
  header,
}: {
  taskId: string;
  header: NormalizedAutomation;
}): Promise<NormalizedAutomation> {
  if (header.type === 'app_automation' && header.checkId) {
    const runs = await db.integrationCheckRun.findMany({
      where: { taskId, checkId: header.checkId },
      include: {
        results: true,
        connection: { include: { provider: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...header,
      runs: runs.map((run) =>
        normalizeAppAutomationRun({
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
        }),
      ),
    };
  }

  const runs = await db.evidenceAutomationRun.findMany({
    where: {
      evidenceAutomation: { id: header.id, taskId },
      version: { not: null },
    },
    include: {
      evidenceAutomation: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    ...header,
    runs: runs.map((run) =>
      normalizeCustomAutomationRun({
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
      }),
    ),
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

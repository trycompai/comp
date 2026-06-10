import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';

/** Default / hard cap for run-history depth per (connection, check) group. */
const DEFAULT_HISTORY_PER_GROUP = 5;
const MAX_HISTORY_PER_GROUP = 50;

export interface CreateCheckRunDto {
  connectionId: string;
  taskId?: string;
  checkId: string;
  checkName: string;
}

export interface CompleteCheckRunDto {
  status: 'success' | 'failed';
  durationMs: number;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  errorMessage?: string;
  logs?: Prisma.InputJsonValue;
}

export interface CreateCheckResultDto {
  checkRunId: string;
  passed: boolean;
  resourceType: string;
  resourceId: string;
  title: string;
  description?: string;
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  remediation?: string;
  evidence?: Prisma.InputJsonValue;
}

@Injectable()
export class CheckRunRepository {
  /**
   * Create a new check run (status = running)
   */
  async create(data: CreateCheckRunDto) {
    return db.integrationCheckRun.create({
      data: {
        connectionId: data.connectionId,
        taskId: data.taskId,
        checkId: data.checkId,
        checkName: data.checkName,
        status: 'running',
        startedAt: new Date(),
      },
    });
  }

  /**
   * Complete a check run with results
   */
  async complete(id: string, data: CompleteCheckRunDto) {
    return db.integrationCheckRun.update({
      where: { id },
      data: {
        status: data.status,
        completedAt: new Date(),
        durationMs: data.durationMs,
        totalChecked: data.totalChecked,
        passedCount: data.passedCount,
        failedCount: data.failedCount,
        errorMessage: data.errorMessage,
        logs: data.logs,
      },
    });
  }

  /**
   * Add a result to a check run
   */
  async addResult(data: CreateCheckResultDto) {
    return db.integrationCheckResult.create({
      data: {
        checkRunId: data.checkRunId,
        passed: data.passed,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        remediation: data.remediation,
        evidence: data.evidence,
      },
    });
  }

  /**
   * Add multiple results in a batch
   */
  async addResults(results: CreateCheckResultDto[]) {
    return db.integrationCheckResult.createMany({
      data: results.map((r) => ({
        checkRunId: r.checkRunId,
        passed: r.passed,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        title: r.title,
        description: r.description,
        severity: r.severity,
        remediation: r.remediation,
        evidence: r.evidence,
      })),
    });
  }

  /**
   * Get a check run by ID with results
   */
  async findById(id: string) {
    return db.integrationCheckRun.findUnique({
      where: { id },
      include: {
        results: true,
        connection: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

  /**
   * Get check runs for a task.
   *
   * CS-166: excludes runs from disconnected connections so the task's UI
   * panels don't render stale "failed" history after a user disconnects the
   * integration. The rows remain in the DB for audit.
   */
  async findByTask(taskId: string, limit = 10) {
    return db.integrationCheckRun.findMany({
      where: {
        taskId,
        connection: { status: { not: 'disconnected' } },
      },
      include: {
        results: true,
        connection: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get check runs for a task, GUARANTEEING every (connection, check) group's
   * most recent run is included (plus a bounded history tail).
   *
   * Why not just `findByTask` with a row limit: checks run once per connected
   * account, so a customer with multiple AWS accounts has one run per account.
   * A flat "newest N rows" limit can silently drop an account whose latest run
   * predates a burst of re-runs on a busier account — that account then
   * vanishes from the task UI. Here we first establish the per-group maxima via
   * `groupBy`, fetch each group's latest run explicitly (completeness), then add
   * a recent window for history. Used by the task UI so manual and scheduled
   * runs both surface every account.
   */
  async findLatestPerConnectionAndCheckByTask(
    taskId: string,
    {
      historyPerGroup = DEFAULT_HISTORY_PER_GROUP,
    }: { historyPerGroup?: number } = {},
  ) {
    // `historyPerGroup` can originate from a user-supplied `?limit=` query param
    // (parsed with parseInt → possibly NaN/negative/huge). Clamp it so it never
    // produces an invalid `take` (500) or an unbounded, expensive read.
    const perGroup =
      Number.isInteger(historyPerGroup) && historyPerGroup > 0
        ? Math.min(historyPerGroup, MAX_HISTORY_PER_GROUP)
        : DEFAULT_HISTORY_PER_GROUP;

    const include = {
      results: true,
      connection: { include: { provider: true } },
    } as const;

    const where = {
      taskId,
      connection: { status: { not: 'disconnected' } },
    } satisfies Prisma.IntegrationCheckRunWhereInput;

    // Every (connection, check) group that has runs for this task, with its
    // most recent run timestamp.
    const groups = await db.integrationCheckRun.groupBy({
      by: ['connectionId', 'checkId'],
      where,
      _max: { createdAt: true },
    });
    if (groups.length === 0) return [];

    // Completeness guarantee: explicitly fetch each group's latest run.
    const tuples = groups.flatMap((g) =>
      g._max.createdAt
        ? [
            {
              connectionId: g.connectionId,
              checkId: g.checkId,
              createdAt: g._max.createdAt,
            },
          ]
        : [],
    );
    const latest = tuples.length
      ? await db.integrationCheckRun.findMany({
          where: { ...where, OR: tuples },
          include,
        })
      : [];

    // History tail: a bounded recent window. Combined with the guaranteed
    // latest set, every account shows its current result and recently-active
    // accounts also show past runs.
    const recent = await db.integrationCheckRun.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      take: groups.length * perGroup,
    });

    // Merge + dedupe by id, newest-first (preserves the /runs ordering contract).
    const byId = new Map<string, (typeof recent)[number]>();
    for (const run of [...latest, ...recent]) byId.set(run.id, run);
    return Array.from(byId.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Get the latest check run for a specific check on a task
   */
  async findLatestByTaskAndCheck(taskId: string, checkId: string) {
    return db.integrationCheckRun.findFirst({
      where: { taskId, checkId },
      include: {
        results: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get check runs for a connection
   */
  async findByConnection(connectionId: string, limit = 20) {
    return db.integrationCheckRun.findMany({
      where: { connectionId },
      include: {
        results: true,
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all check runs for an organization (via connections)
   */
  async findByOrganization(organizationId: string, limit = 50) {
    return db.integrationCheckRun.findMany({
      where: {
        connection: {
          organizationId,
        },
      },
      include: {
        results: true,
        connection: {
          include: {
            provider: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

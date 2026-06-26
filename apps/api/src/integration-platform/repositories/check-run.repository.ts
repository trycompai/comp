import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';

/** Default / hard cap for run-history depth per (connection, check) group. */
const DEFAULT_HISTORY_PER_GROUP = 5;
const MAX_HISTORY_PER_GROUP = 50;

/**
 * Max result rows loaded PER RUN for the task run-history view. A single check
 * can legitimately produce tens of thousands of results — e.g. a Firebase B2C
 * tenant whose check yields one result per auth user. Eager-loading them all
 * (`results: true`) hydrates the entire set into memory for every run in the
 * window, which hangs or OOMs the request (the task UI then never loads). The
 * UI only renders a few results per category, so we load a small findings-first
 * window. Authoritative totals come from the run's summary columns + a targeted
 * exception count (see {@link CheckRunRepository.countExceptedFailures}), never
 * from this sample.
 */
const DISPLAY_RESULTS_PER_RUN = 30;

export interface CreateCheckRunDto {
  connectionId: string;
  taskId?: string;
  checkId: string;
  checkName: string;
}

export interface CompleteCheckRunDto {
  // 'inconclusive' = held our-side/transient failure (dynamic self-heal queue);
  // hidden from the customer and picked up by the agent. See run paths.
  status: 'success' | 'failed' | 'inconclusive';
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

    // Bounded, findings-first result load. `take` is applied PER RUN by Prisma
    // (correlated limit at the DB), so a run with a huge result set can never
    // pull more than DISPLAY_RESULTS_PER_RUN rows. Failing first (`passed asc`)
    // so the UI's findings always surface even when truncated; passing fills
    // any remaining slots.
    const include = {
      results: {
        take: DISPLAY_RESULTS_PER_RUN,
        orderBy: [{ passed: 'asc' }, { collectedAt: 'asc' }],
      },
      connection: { include: { provider: true } },
    } satisfies Prisma.IntegrationCheckRunInclude;

    const where = {
      taskId,
      connection: { status: { not: 'disconnected' } },
      // Held (our-side/transient) runs are stored as `inconclusive` so the
      // self-heal agent can fix them under the hood, but the customer must NEVER
      // see them. Excluding them here means the task UI shows each account's
      // latest REAL (non-held) run — or nothing if a check has only ever been
      // held ("not run yet") — never a red caused by our own bug. Once the
      // agent's fix lands, the next real run surfaces here normally.
      status: { not: 'inconclusive' },
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
   * Count a run's FAILING results whose resourceId is under an active exception.
   * Lets the task UI compute the effective (non-excepted) failure count exactly
   * WITHOUT loading every result row — only the bounded display sample is
   * hydrated; this count covers the full set. `resourceIds` is the excepted set
   * for the run's (connection, check); callers pass an empty list (and skip the
   * call) when nothing is excepted, which is the common case.
   */
  async countExceptedFailures(
    runId: string,
    resourceIds: string[],
  ): Promise<number> {
    if (resourceIds.length === 0) return 0;
    return db.integrationCheckResult.count({
      where: {
        checkRunId: runId,
        passed: false,
        resourceId: { in: resourceIds },
      },
    });
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

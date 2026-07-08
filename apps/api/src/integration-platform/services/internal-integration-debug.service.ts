import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { isCodeManifest } from '@trycompai/integration-platform';
import {
  ConnectionCheckRunnerService,
  type RunAllChecksResult,
} from './connection-check-runner.service';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { decideRunStatus } from '../utils/task-check-evaluation';
import { DynamicManifestLoaderService } from './dynamic-manifest-loader.service';

/**
 * Read-only/diagnostic toolkit for dynamic integrations, used by internal
 * operators (and AI agents) to debug a customer's connection end-to-end WITHOUT
 * a direct database tunnel and WITHOUT ever exposing secret credential values.
 *
 * Credential metadata is derived from the stored payload WITHOUT decrypting it:
 * secrets are stored as encrypted blobs (shown only as `{ present, encrypted }`)
 * while non-secret routing fields (e.g. `api_domain`, `scope`, `region`,
 * `token_type`, `expires_at`) are stored in plaintext and surfaced directly.
 * As defense-in-depth, any plaintext field whose NAME looks secret is masked
 * too, so an accidentally-plaintext secret still never leaves the API.
 */
@Injectable()
export class InternalIntegrationDebugService {
  private readonly logger = new Logger(InternalIntegrationDebugService.name);

  // Field NAMES that must never have their value returned, even if (wrongly)
  // stored as plaintext. Encrypted blobs are masked regardless of name.
  private static readonly SECRET_KEY_RE =
    /(secret|password|passwd|pwd|private|access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key|apikey|bearer|signing)/i;

  constructor(
    private readonly runner: ConnectionCheckRunnerService,
    private readonly checkRunRepository: CheckRunRepository,
    private readonly manifestLoader: DynamicManifestLoaderService,
  ) {}

  private isEncryptedData(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      'encrypted' in (value as Record<string, unknown>) &&
      'iv' in (value as Record<string, unknown>) &&
      'tag' in (value as Record<string, unknown>) &&
      'salt' in (value as Record<string, unknown>)
    );
  }

  /**
   * Build a non-sensitive view of a credential payload. Never decrypts; never
   * returns a secret value.
   */
  private buildCredentialMetadata(
    version: {
      version: number;
      createdAt: Date;
      expiresAt: Date | null;
      encryptedPayload: unknown;
    } | null,
  ) {
    if (!version) return null;
    const payload =
      version.encryptedPayload && typeof version.encryptedPayload === 'object'
        ? (version.encryptedPayload as Record<string, unknown>)
        : {};

    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (this.isEncryptedData(value)) {
        fields[key] = { present: true, encrypted: true };
      } else if (Array.isArray(value)) {
        const hasEncrypted = value.some((item) => this.isEncryptedData(item));
        fields[key] = hasEncrypted
          ? { present: true, encrypted: true, count: value.length }
          : InternalIntegrationDebugService.SECRET_KEY_RE.test(key)
            ? { present: true, masked: true }
            : { present: true, value };
      } else if (InternalIntegrationDebugService.SECRET_KEY_RE.test(key)) {
        fields[key] = { present: true, masked: true };
      } else {
        fields[key] = { present: true, value };
      }
    }

    return {
      version: version.version,
      createdAt: version.createdAt,
      expiresAt: version.expiresAt,
      expired: version.expiresAt
        ? version.expiresAt.getTime() < Date.now()
        : false,
      fields,
    };
  }

  private async getActiveCredentialMetadata(
    activeCredentialVersionId: string | null,
  ) {
    if (!activeCredentialVersionId) return null;
    const version = await db.integrationCredentialVersion.findUnique({
      where: { id: activeCredentialVersionId },
      select: {
        version: true,
        createdAt: true,
        expiresAt: true,
        encryptedPayload: true,
      },
    });
    return this.buildCredentialMetadata(version);
  }

  /**
   * List connections, filterable by org / provider / connection id, with a
   * non-sensitive credential view and the most recent run summary for each.
   * Related data is batch-fetched (no N+1).
   */
  async listConnections(params: {
    organizationId?: string;
    providerSlug?: string;
    connectionId?: string;
    limit?: number;
  }) {
    const { organizationId, providerSlug, connectionId } = params;
    const rawLimit = params.limit ?? NaN;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 200)
      : 50;

    const connections = await db.integrationConnection.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(connectionId ? { id: connectionId } : {}),
        ...(providerSlug ? { provider: { slug: providerSlug } } : {}),
      },
      include: { provider: { select: { slug: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // Batch-fetch the active credential versions and the latest run per
    // connection in two queries instead of two-per-connection.
    const versionIds = connections
      .map((c) => c.activeCredentialVersionId)
      .filter((id): id is string => Boolean(id));
    const connectionIds = connections.map((c) => c.id);

    const [versions, latestRuns] = await Promise.all([
      versionIds.length
        ? db.integrationCredentialVersion.findMany({
            where: { id: { in: versionIds } },
            select: {
              id: true,
              version: true,
              createdAt: true,
              expiresAt: true,
              encryptedPayload: true,
            },
          })
        : Promise.resolve([]),
      connectionIds.length
        ? db.integrationCheckRun.findMany({
            where: { connectionId: { in: connectionIds } },
            orderBy: { createdAt: 'desc' },
            distinct: ['connectionId'],
            select: {
              id: true,
              connectionId: true,
              checkId: true,
              status: true,
              passedCount: true,
              failedCount: true,
              completedAt: true,
              errorMessage: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const versionById = new Map(versions.map((v) => [v.id, v] as const));
    const latestRunByConn = new Map(
      latestRuns.map((r) => [r.connectionId, r] as const),
    );

    const items = connections.map((conn) => ({
      id: conn.id,
      organizationId: conn.organizationId,
      provider: conn.provider
        ? { slug: conn.provider.slug, name: conn.provider.name }
        : null,
      status: conn.status,
      errorMessage: conn.errorMessage,
      updatedAt: conn.updatedAt,
      variables: conn.variables ?? null,
      credential: conn.activeCredentialVersionId
        ? this.buildCredentialMetadata(
            versionById.get(conn.activeCredentialVersionId) ?? null,
          )
        : null,
      latestRun: latestRunByConn.get(conn.id) ?? null,
    }));

    return { connections: items, total: items.length };
  }

  /**
   * Full detail for a single connection: non-sensitive credential view plus the
   * most recent runs (with logs + results) for debugging.
   */
  async getConnection(connectionId: string, runLimit = 5) {
    const conn = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      include: { provider: { select: { slug: true, name: true } } },
    });
    if (!conn) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }

    const take = Number.isFinite(runLimit)
      ? Math.min(Math.max(runLimit, 1), 20)
      : 5;
    const recentRuns = await db.integrationCheckRun.findMany({
      where: { connectionId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        results: {
          select: {
            id: true,
            passed: true,
            title: true,
            resourceType: true,
            resourceId: true,
            severity: true,
          },
        },
      },
    });

    return {
      id: conn.id,
      organizationId: conn.organizationId,
      provider: conn.provider
        ? { slug: conn.provider.slug, name: conn.provider.name }
        : null,
      status: conn.status,
      errorMessage: conn.errorMessage,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      variables: conn.variables ?? null,
      credential: await this.getActiveCredentialMetadata(
        conn.activeCredentialVersionId,
      ),
      recentRuns: recentRuns.map((run) => ({
        id: run.id,
        checkId: run.checkId,
        checkName: run.checkName,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        durationMs: run.durationMs,
        passedCount: run.passedCount,
        failedCount: run.failedCount,
        errorMessage: run.errorMessage,
        logs: run.logs,
        results: run.results,
      })),
    };
  }

  /**
   * Run a connection's checks on the real runtime (the same path the in-app
   * "Run" uses) and return findings + passing results + logs. NEVER persists —
   * this is purely for verification/debugging, so it cannot pollute the
   * customer's dashboard.
   */
  async runConnectionChecks(params: {
    connectionId: string;
    checkId?: string;
  }): Promise<RunAllChecksResult> {
    const { connectionId, checkId } = params;
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { organizationId: true },
    });
    if (!connection) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    this.logger.log(
      `Internal dry-run for connection ${connectionId}${checkId ? ` (check: ${checkId})` : ''}`,
    );
    return this.runner.runChecks({
      connectionId,
      organizationId: connection.organizationId,
      checkId,
    });
  }

  /**
   * Run CANDIDATE check code against this connection's real credentials on the
   * real runtime, persisting nothing and never touching the live shared check.
   * This is the safe way to validate a fix BEFORE applying it via
   * `PATCH /internal/dynamic-integrations/:id/checks/:checkId`.
   */
  async testCandidateCode(params: {
    connectionId: string;
    code: string;
    checkId?: string;
  }): Promise<RunAllChecksResult> {
    const { connectionId, code, checkId } = params;
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { organizationId: true },
    });
    if (!connection) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    this.logger.log(
      `Internal candidate-code test for connection ${connectionId}${checkId ? ` (check: ${checkId})` : ''}`,
    );
    return this.runner.runCandidateCheck({
      connectionId,
      organizationId: connection.organizationId,
      code,
      checkId,
    });
  }

  /**
   * Read recently captured OAuth callback errors (recorded by the frontend when
   * a connect redirects back with an error). Makes a failed connect diagnosable
   * after the fact instead of being invisible.
   */
  async listOAuthErrors(params: {
    organizationId?: string;
    providerSlug?: string;
    limit?: number;
  }) {
    const { organizationId, providerSlug } = params;
    const rawLimit = params.limit ?? NaN;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 200)
      : 50;
    const errors = await db.integrationOAuthError.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(providerSlug ? { providerSlug } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { errors, total: errors.length };
  }

  /**
   * The self-heal agent's work queue: check runs HELD as inconclusive (an
   * our-side / transient failure the customer never saw as a red "failed"). The
   * agent polls this, then diagnoses + fixes each via run/test/PATCH. Newest
   * first. Failing results (with evidence) are included so the agent can classify
   * without an extra round-trip.
   */
  async listInconclusiveRuns(params: {
    providerSlug?: string;
    organizationId?: string;
    limit?: number;
  }) {
    const { providerSlug, organizationId } = params;
    const rawLimit = params.limit ?? NaN;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 200)
      : 50;
    const candidates = await db.integrationCheckRun.findMany({
      where: {
        status: 'inconclusive',
        connection: {
          ...(organizationId ? { organizationId } : {}),
          ...(providerSlug ? { provider: { slug: providerSlug } } : {}),
        },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        checkId: true,
        checkName: true,
        status: true,
        completedAt: true,
        // taskId so the agent can re-run + persist for the right task after a fix.
        taskId: true,
        // The evidence task's title is the check's INTENT (e.g. "App
        // availability") — the agent uses it to fix toward what the check should
        // verify, not just to make it pass.
        task: { select: { title: true } },
        connection: {
          select: {
            id: true,
            organizationId: true,
            provider: { select: { slug: true, name: true } },
          },
        },
        results: {
          where: { passed: false },
          // Bound the nested failing results: a check can produce thousands of
          // findings (each with evidence). The agent only needs a sample to
          // diagnose (it reads the first few), so cap the payload per run.
          take: 20,
          orderBy: { collectedAt: 'asc' },
          select: {
            resourceId: true,
            resourceType: true,
            title: true,
            description: true,
            evidence: true,
          },
        },
      },
    });
    if (candidates.length === 0) return { runs: [], total: 0 };

    // Runs are append-only and a held `inconclusive` status is never cleared, so
    // once a check recovers (or we fix it) a newer run exists and the old
    // inconclusive row becomes stale. Surface a check only if its LATEST run is
    // still inconclusive — otherwise the agent would re-attempt already-healthy
    // checks on every poll. (The agent also re-verifies live as a backstop.)
    const pairs = new Map<string, { connectionId: string; checkId: string }>();
    for (const run of candidates) {
      const key = `${run.connection.id} ${run.checkId}`;
      if (!pairs.has(key)) {
        pairs.set(key, {
          connectionId: run.connection.id,
          checkId: run.checkId,
        });
      }
    }
    const latestPerPair = await db.integrationCheckRun.groupBy({
      by: ['connectionId', 'checkId'],
      where: { OR: Array.from(pairs.values()) },
      _max: { completedAt: true },
    });
    const latestByPair = new Map(
      latestPerPair.map((g) => [
        `${g.connectionId} ${g.checkId}`,
        g._max.completedAt?.getTime() ?? 0,
      ]),
    );
    const runs = candidates.filter((run) => {
      const latest =
        latestByPair.get(`${run.connection.id} ${run.checkId}`) ?? 0;
      // Keep only if this inconclusive run is the latest for its (conn, check) —
      // i.e. no newer run (of any status) has superseded it.
      return (run.completedAt?.getTime() ?? 0) >= latest;
    });
    return { runs, total: runs.length };
  }

  /**
   * A persisted run may only be associated with a task in the SAME org as the
   * connection. The agent always passes the held run's own taskId, but validate
   * it so a wrong/forged internal call can't write into another tenant's task
   * history or flip its status. No-op when no taskId is supplied.
   */
  private async assertTaskBelongsToOrg(
    taskId: string | null | undefined,
    organizationId: string,
    connectionId: string,
  ): Promise<void> {
    if (!taskId) return;
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { organizationId: true },
    });
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundException(
        `Task ${taskId} does not belong to connection ${connectionId}'s organization`,
      );
    }
  }

  /**
   * Re-run ONE check for ONE connection AND PERSIST a fresh run. Used by the
   * self-heal agent right after it applies a fix: re-running every affected
   * customer's connection means a now-fixed check produces a fresh 'success'
   * (the customer sees green without doing anything), while one still failing
   * for an our-side reason is re-held as 'inconclusive' (still hidden). Unlike
   * /run + /test (verification-only, never persist) this writes a real run via
   * the same create -> addResults -> complete path the run paths use, so the run
   * status is decided by the SAME shared rule (held vs shown).
   */
  async rerunAndPersistCheck(params: {
    connectionId: string;
    checkId: string;
    taskId?: string | null;
  }): Promise<{ status: 'success' | 'failed' | 'inconclusive' }> {
    const { connectionId, checkId, taskId } = params;
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { organizationId: true, provider: { select: { slug: true } } },
    });
    if (!connection) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    await this.assertTaskBelongsToOrg(taskId, connection.organizationId, connectionId);

    // The runner resolves dynamic check code from the in-memory manifest
    // registry, which only refreshes from the DB every ~60s. A self-heal re-run
    // fires seconds after the agent PATCHes a fix, so without a refresh here the
    // re-run would execute the STALE (pre-fix) code and wrongly re-hold a check
    // we just fixed. Refresh first so this persisted re-run reflects current DB.
    // Best-effort: on a transient refresh failure, fall back to the cached
    // manifests rather than failing the whole re-run.
    try {
      await this.manifestLoader.loadDynamicManifests();
    } catch (err) {
      this.logger.warn(
        `Self-heal re-run: manifest refresh failed, using cached manifests: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    // Execute on the real runtime in-process (runChecks never persists).
    const result = await this.runner.runChecks({
      connectionId,
      organizationId: connection.organizationId,
      checkId,
    });
    const checkResult = result.results[0];
    if (!checkResult) {
      throw new NotFoundException(
        `Check ${checkId} produced no result for connection ${connectionId}`,
      );
    }

    // A code-based manifest wins over a dynamic integration of the same slug, so
    // its checks are static and must NEVER be re-held as 'inconclusive' here —
    // otherwise the self-heal agent's re-run would re-hide a code check it cannot
    // patch, looping it as hidden forever (CS-715). Mirrors the run-check paths:
    // only a provider with NO code manifest is dynamic. Dynamic integrations are
    // unaffected (isCodeManifest is false for them → same DB check as before).
    const providerSlug = connection.provider?.slug ?? '';
    const isDynamic = isCodeManifest(providerSlug)
      ? false
      : !!(await db.dynamicIntegration.findFirst({
          where: { slug: providerSlug, isActive: true },
          select: { id: true },
        }));

    const status = decideRunStatus({
      resultStatus: checkResult.status,
      isDynamic,
    });

    const checkRun = await this.checkRunRepository.create({
      connectionId,
      taskId: taskId ?? undefined,
      checkId,
      checkName: checkResult.checkName,
    });
    const resultsToStore = [
      ...checkResult.result.passingResults.map((r) => ({
        checkRunId: checkRun.id,
        passed: true,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        title: r.title,
        description: r.description,
        evidence: r.evidence
          ? (JSON.parse(JSON.stringify(r.evidence)) as Prisma.InputJsonValue)
          : undefined,
      })),
      ...checkResult.result.findings.map((f) => ({
        checkRunId: checkRun.id,
        passed: false,
        resourceType: f.resourceType,
        resourceId: f.resourceId,
        title: f.title,
        description: f.description,
        severity: f.severity,
        remediation: f.remediation,
        evidence: f.evidence as Prisma.InputJsonValue,
      })),
    ];
    if (resultsToStore.length > 0) {
      await this.checkRunRepository.addResults(resultsToStore);
    }
    await this.checkRunRepository.complete(checkRun.id, {
      status,
      durationMs: checkResult.durationMs,
      totalChecked:
        checkResult.result.summary?.totalChecked ??
        checkResult.result.passingResults.length +
          checkResult.result.findings.length,
      passedCount: checkResult.result.passingResults.length,
      // Held (inconclusive) runs have no CONFIRMED failures — findings persist as
      // results for the agent, but the run shows 0 failures.
      failedCount:
        status === 'inconclusive' ? 0 : checkResult.result.findings.length,
      errorMessage: checkResult.error,
      logs: JSON.parse(
        JSON.stringify(checkResult.result.logs),
      ) as Prisma.InputJsonValue,
    });

    this.logger.log(
      `Self-heal re-run: connection ${connectionId}, check ${checkId} -> ${status}`,
    );
    return { status };
  }

  /**
   * Re-run ONE check and PERSIST the REAL result — used when the self-heal agent
   * verdicts a held check as a GENUINE fail (the customer's creds/config are
   * wrong, OR a real compliance finding). Unlike rerunAndPersistCheck (which
   * applies the dynamic hold rule and may re-hold as 'inconclusive'), this writes
   * the TRUE status: 'success' if it now passes, 'failed' (with the real findings
   * shown, failedCount > 0) otherwise — so the customer sees the red instead of a
   * silent "pending". It never holds and never disables.
   */
  async revealAndPersistCheck(params: {
    connectionId: string;
    checkId: string;
    taskId?: string | null;
  }): Promise<{ status: 'success' | 'failed' }> {
    const { connectionId, checkId, taskId } = params;
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { organizationId: true },
    });
    if (!connection) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    await this.assertTaskBelongsToOrg(taskId, connection.organizationId, connectionId);

    const result = await this.runner.runChecks({
      connectionId,
      organizationId: connection.organizationId,
      checkId,
    });
    const checkResult = result.results[0];
    if (!checkResult) {
      throw new NotFoundException(
        `Check ${checkId} produced no result for connection ${connectionId}`,
      );
    }

    // The REAL status — never held. A genuine fail shows red to the customer.
    const status: 'success' | 'failed' =
      checkResult.status === 'success' ? 'success' : 'failed';

    const checkRun = await this.checkRunRepository.create({
      connectionId,
      taskId: taskId ?? undefined,
      checkId,
      checkName: checkResult.checkName,
    });
    const resultsToStore = [
      ...checkResult.result.passingResults.map((r) => ({
        checkRunId: checkRun.id,
        passed: true,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        title: r.title,
        description: r.description,
        evidence: r.evidence
          ? (JSON.parse(JSON.stringify(r.evidence)) as Prisma.InputJsonValue)
          : undefined,
      })),
      ...checkResult.result.findings.map((f) => ({
        checkRunId: checkRun.id,
        passed: false,
        resourceType: f.resourceType,
        resourceId: f.resourceId,
        title: f.title,
        description: f.description,
        severity: f.severity,
        remediation: f.remediation,
        evidence: f.evidence as Prisma.InputJsonValue,
      })),
    ];
    if (resultsToStore.length > 0) {
      await this.checkRunRepository.addResults(resultsToStore);
    }
    await this.checkRunRepository.complete(checkRun.id, {
      status,
      durationMs: checkResult.durationMs,
      totalChecked:
        checkResult.result.summary?.totalChecked ??
        checkResult.result.passingResults.length +
          checkResult.result.findings.length,
      passedCount: checkResult.result.passingResults.length,
      // REAL fail → show the findings (NOT hidden like a held 'inconclusive' run).
      failedCount: checkResult.result.findings.length,
      errorMessage: checkResult.error,
      logs: JSON.parse(
        JSON.stringify(checkResult.result.logs),
      ) as Prisma.InputJsonValue,
    });

    // Sync the TASK: a genuine fail must show on the task itself, not just in run
    // history — otherwise the task stays green while the check failed, the exact
    // false-success the reveal flow exists to prevent. Mirrors the run paths'
    // decideTaskStatus → 'failed' write. A reveal that now PASSES does NOT force
    // 'done' here: the task spans other checks and is recomputed on the next
    // scheduled run (forcing 'done' could hide another still-failing/held check).
    if (taskId && status === 'failed') {
      // Only flip ACTIVE workflow statuses → failed. Never resurrect a human-set
      // not_relevant (dismissed) or in_review (under review) task — or rewrite an
      // already-failed one — from a self-heal reveal.
      await db.task.updateMany({
        where: { id: taskId, status: { in: ['todo', 'in_progress', 'done'] } },
        data: { status: 'failed' },
      });
    }

    this.logger.log(
      `Self-heal reveal: connection ${connectionId}, check ${checkId} -> ${status} (real result shown)`,
    );
    return { status };
  }
}

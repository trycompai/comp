import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import {
  ConnectionCheckRunnerService,
  type RunAllChecksResult,
} from './connection-check-runner.service';

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

  constructor(private readonly runner: ConnectionCheckRunnerService) {}

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
  private buildCredentialMetadata(version: {
    version: number;
    createdAt: Date;
    expiresAt: Date | null;
    encryptedPayload: unknown;
  } | null) {
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
      expired: version.expiresAt ? version.expiresAt.getTime() < Date.now() : false,
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
}

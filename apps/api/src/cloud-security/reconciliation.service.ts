import { Injectable, Logger } from '@nestjs/common';
import { db, FindingResolutionMethod } from '@db';
import { normalizeCheckId } from './check-definition.utils';
import { CloudExceptionService } from './exception.service';

interface NormalizedResult {
  id: string;
  findingKey: string;
  resourceId: string;
  resourceType: string | null;
  serviceId: string | null;
  passed: boolean;
}

/**
 * Reconciles the most-recent terminal-state IntegrationCheckRun for a
 * connection against its prior run, writing FindingResolution and
 * FindingRegression rows. Idempotent per `currentRunId` — re-running on
 * the same run is a no-op (existing rows scoped to that run are
 * detected and skipped).
 *
 * Edge cases handled:
 *  - First scan: no prior run → nothing to reconcile.
 *  - Partial scan: if a service isn't in `scannedServices`, prior
 *    findings for that service are NOT marked resolved — they're carried
 *    forward as unknown.
 *  - Resource renamed: appears as old-resolved + new-failure. v1 limitation
 *    (documented in plan); v2 would track underlying ARN.
 */
@Injectable()
export class CloudReconciliationService {
  private readonly logger = new Logger(CloudReconciliationService.name);

  constructor(private readonly exceptions: CloudExceptionService) {}

  async reconcile(params: { currentRunId: string }): Promise<{
    resolutions: number;
    regressions: number;
    skipped: boolean;
  }> {
    const currentRun = await db.integrationCheckRun.findUnique({
      where: { id: params.currentRunId },
      select: {
        id: true,
        connectionId: true,
        completedAt: true,
        startedAt: true,
        status: true,
        scannedServices: true,
        connection: { select: { organizationId: true } },
        results: {
          select: {
            id: true,
            passed: true,
            resourceId: true,
            resourceType: true,
            evidence: true,
          },
        },
      },
    });

    if (!currentRun || currentRun.status !== 'success') {
      // Don't reconcile against an incomplete scan — incorrect "resolved"
      // events would mislead auditors. Only successful scans produce truth.
      return { resolutions: 0, regressions: 0, skipped: true };
    }

    // Idempotency guard — if reconciliation already wrote rows for this run,
    // skip silently. Check BOTH resolutions and regressions: a run that
    // produced only regressions (no resolutions) would otherwise be
    // re-reconciled and duplicate the regression rows.
    const [priorResolution, priorRegression] = await Promise.all([
      db.findingResolution.findFirst({
        where: { detectedInRunId: currentRun.id },
        select: { id: true },
      }),
      db.findingRegression.findFirst({
        where: { detectedInRunId: currentRun.id },
        select: { id: true },
      }),
    ]);
    if (priorResolution || priorRegression) {
      return { resolutions: 0, regressions: 0, skipped: true };
    }

    const priorRun = await db.integrationCheckRun.findFirst({
      where: {
        connectionId: currentRun.connectionId,
        id: { not: currentRun.id },
        status: 'success',
        completedAt: { lt: currentRun.completedAt ?? currentRun.startedAt ?? new Date() },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        completedAt: true,
        results: {
          select: {
            id: true,
            passed: true,
            resourceId: true,
            resourceType: true,
            evidence: true,
          },
        },
      },
    });

    if (!priorRun) {
      // First scan — nothing to reconcile against.
      return { resolutions: 0, regressions: 0, skipped: false };
    }

    const organizationId = currentRun.connection.organizationId;
    const scannedServices = new Set(currentRun.scannedServices ?? []);
    const treatPartialScan = scannedServices.size > 0; // empty = scan didn't track services; treat as "all scanned"

    const currentMap = indexResults(currentRun.results);
    const priorMap = indexResults(priorRun.results);

    let resolutions = 0;
    let regressions = 0;

    // Resolutions: prior failed → current absent or passed.
    for (const [key, prior] of priorMap.entries()) {
      if (!prior.passed === false) continue; // only interested in prior failures
      if (prior.passed) continue;

      const current = currentMap.get(key);
      if (current && !current.passed) continue; // still failing

      const checkKey = normalizeCheckId(prior.findingKey, prior.resourceId);

      if (treatPartialScan && prior.serviceId && !scannedServices.has(prior.serviceId)) {
        // Service wasn't scanned this run — carry forward, don't resolve.
        continue;
      }

      const method = await this.determineResolutionMethod({
        organizationId,
        connectionId: currentRun.connectionId,
        priorRunCompletedAt: priorRun.completedAt,
        currentRunStartedAt:
          currentRun.startedAt ?? currentRun.completedAt ?? new Date(),
        checkKey,
        resourceId: prior.resourceId,
        currentExists: Boolean(current),
        // Scope the platform_fix lookup to THIS specific check — without it,
        // an unrelated fix on the same resource gets mis-attributed as
        // having resolved this check.
        priorCheckResultId: prior.id,
      });

      const daysOpen =
        priorRun.completedAt && currentRun.completedAt
          ? daysBetween(priorRun.completedAt, currentRun.completedAt)
          : null;

      await db.findingResolution.create({
        data: {
          organizationId,
          connectionId: currentRun.connectionId,
          checkId: checkKey,
          resourceId: prior.resourceId,
          resourceType: prior.resourceType,
          resolvedAt: currentRun.completedAt ?? new Date(),
          resolutionMethod: method.method,
          resolvedById: method.resolvedById ?? null,
          remediationActionId: method.remediationActionId ?? null,
          resolvedFromRunId: priorRun.id,
          detectedInRunId: currentRun.id,
          daysOpen,
        },
      });
      resolutions += 1;
    }

    // Regressions: previously-resolved (checkKey, resourceId) failing again
    // in current run. Look back across ALL prior resolutions for this
    // connection — not just the immediate-prior run.
    for (const [key, current] of currentMap.entries()) {
      if (current.passed) continue;
      const checkKey = normalizeCheckId(current.findingKey, current.resourceId);

      const lastResolution = await db.findingResolution.findFirst({
        where: {
          connectionId: currentRun.connectionId,
          checkId: checkKey,
          resourceId: current.resourceId,
        },
        orderBy: { resolvedAt: 'desc' },
        select: { id: true, resolvedAt: true },
      });
      if (!lastResolution) continue;

      // If this same (checkKey, resourceId) was failing in priorRun too, it's
      // a still-failing finding, not a regression.
      if (priorMap.get(key) && !priorMap.get(key)!.passed) continue;

      const daysClean = currentRun.completedAt
        ? daysBetween(lastResolution.resolvedAt, currentRun.completedAt)
        : null;

      await db.findingRegression.create({
        data: {
          organizationId,
          connectionId: currentRun.connectionId,
          checkId: checkKey,
          resourceId: current.resourceId,
          previouslyResolvedAt: lastResolution.resolvedAt,
          previousResolutionId: lastResolution.id,
          regressedAt: currentRun.completedAt ?? new Date(),
          detectedInRunId: currentRun.id,
          daysClean,
        },
      });
      regressions += 1;
    }

    this.logger.log(
      `Reconciled run ${currentRun.id}: ${resolutions} resolved, ${regressions} regressed`,
    );
    return { resolutions, regressions, skipped: false };
  }

  private async determineResolutionMethod(input: {
    organizationId: string;
    connectionId: string;
    priorRunCompletedAt: Date | null;
    currentRunStartedAt: Date;
    checkKey: string;
    resourceId: string;
    currentExists: boolean;
    priorCheckResultId: string;
  }): Promise<{
    method: FindingResolutionMethod;
    resolvedById?: string;
    remediationActionId?: string;
  }> {
    // 1) Did the user mark it as an exception between scans?
    const exceptionActive = await this.exceptions.isExceptionActive({
      organizationId: input.organizationId,
      connectionId: input.connectionId,
      checkId: input.checkKey,
      resourceId: input.resourceId,
    });
    if (exceptionActive) return { method: 'exception_marked' };

    // 2) Did our Fix button apply a successful remediation between scans?
    //    Scope by `checkResultId` so a fix for check A on resource X doesn't
    //    get attributed to check B on the same resource. RemediationAction
    //    is created with the prior run's checkResultId, so matching against
    //    `prior.id` ties the fix to THIS check, not any check on the resource.
    if (input.priorRunCompletedAt) {
      const fix = await db.remediationAction.findFirst({
        where: {
          connectionId: input.connectionId,
          checkResultId: input.priorCheckResultId,
          status: 'success',
          createdAt: {
            gte: input.priorRunCompletedAt,
            lte: input.currentRunStartedAt,
          },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, initiatedById: true },
      });
      if (fix) {
        return {
          method: 'platform_fix',
          remediationActionId: fix.id,
          resolvedById: fix.initiatedById ?? undefined,
        };
      }
    }

    // 3) Resource missing entirely from current results → deleted.
    if (!input.currentExists) return { method: 'resource_deleted' };

    // 4) Otherwise — customer fixed it outside our platform.
    return { method: 'external_fix' };
  }
}

function indexResults(
  results: Array<{
    id: string;
    passed: boolean;
    resourceId: string | null;
    resourceType: string | null;
    evidence: unknown;
  }>,
): Map<string, NormalizedResult> {
  const map = new Map<string, NormalizedResult>();
  for (const r of results) {
    if (!r.resourceId) continue;
    const evidence =
      r.evidence && typeof r.evidence === 'object'
        ? (r.evidence as Record<string, unknown>)
        : null;
    const findingKey =
      evidence && typeof evidence.findingKey === 'string'
        ? evidence.findingKey
        : null;
    if (!findingKey) continue;
    const serviceId =
      evidence && typeof evidence.serviceId === 'string'
        ? evidence.serviceId
        : null;
    const checkKey = normalizeCheckId(findingKey, r.resourceId);
    const compositeKey = `${checkKey}::${r.resourceId}`;
    map.set(compositeKey, {
      id: r.id,
      findingKey,
      resourceId: r.resourceId,
      resourceType: r.resourceType,
      serviceId,
      passed: r.passed,
    });
  }
  return map;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

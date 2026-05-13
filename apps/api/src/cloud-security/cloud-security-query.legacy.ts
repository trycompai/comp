/**
 * Legacy (pre-integration-platform) cloud security queries.
 *
 * Extracted from cloud-security-query.service.ts so the main service stays
 * under the 300-line cap and so the legacy path can be deleted as a unit
 * once the legacy Integration / IntegrationResult tables are retired.
 */

import { db } from '@db';
import { sanitizeEvidence } from './evidence-sanitizer';
import type { CloudFinding } from './cloud-security-query.types';

const CLOUD_PROVIDER_SLUGS = ['aws', 'gcp', 'azure'] as const;

/** Scan window for filtering legacy results to latest scan only */
export const SCAN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface LatestScanResult {
  integrationId: string;
  completedAt: Date | null;
}

/**
 * Keep only the legacy IntegrationResult rows that belong to each
 * integration's most-recent scan.
 *
 * The naive `completedAt <= lastRunAt` filter silently hides results when
 * a scan writes IntegrationResult rows but does NOT advance
 * Integration.lastRunAt (a known consistency gap on the legacy path).
 *
 * Robust strategy: per integration, treat the LATER of `lastRunAt` and
 * the maximum result `completedAt` as the "effective" last-run time, and
 * keep all results within SCAN_WINDOW_MS of that reference. Falls back
 * to either signal alone when the other is missing.
 *
 * Exported for unit-testing — the function is pure and takes its inputs
 * explicitly so the test suite doesn't have to mock Prisma.
 */
export function filterToLatestScanResults<T extends LatestScanResult>(
  results: T[],
  lastRunMap: Map<string, Date>,
): T[] {
  // Per-integration maximum result completedAt — the only authoritative
  // signal that survives a missing-lastRunAt-advance bug.
  const maxCompletedMsByIntegration = new Map<string, number>();
  for (const r of results) {
    if (!r.completedAt) continue;
    const t = r.completedAt.getTime();
    const current = maxCompletedMsByIntegration.get(r.integrationId);
    if (current === undefined || t > current) {
      maxCompletedMsByIntegration.set(r.integrationId, t);
    }
  }

  return results.filter((r) => {
    if (!r.completedAt) return false;
    const lastRunMs = lastRunMap.get(r.integrationId)?.getTime();
    const maxResultMs = maxCompletedMsByIntegration.get(r.integrationId);
    // Use whichever signal is later — handles both directions of skew.
    const referenceMs =
      lastRunMs !== undefined && maxResultMs !== undefined
        ? Math.max(lastRunMs, maxResultMs)
        : (lastRunMs ?? maxResultMs);
    if (referenceMs === undefined) return false;
    const completedMs = r.completedAt.getTime();
    return (
      completedMs <= referenceMs &&
      completedMs >= referenceMs - SCAN_WINDOW_MS
    );
  });
}

export async function getLegacyFindings(
  organizationId: string,
): Promise<CloudFinding[]> {
  const legacyIntegrations = await db.integration.findMany({
    where: { organizationId },
  });

  const activeLegacy = legacyIntegrations.filter((i) =>
    (CLOUD_PROVIDER_SLUGS as readonly string[]).includes(i.integrationId),
  );

  const legacyIds = activeLegacy.map((i) => i.id);
  if (legacyIds.length === 0) return [];

  const lastRunMap = new Map(
    activeLegacy.filter((i) => i.lastRunAt).map((i) => [i.id, i.lastRunAt!]),
  );

  const results = await db.integrationResult.findMany({
    where: { integrationId: { in: legacyIds } },
    select: {
      id: true,
      title: true,
      description: true,
      remediation: true,
      status: true,
      severity: true,
      completedAt: true,
      resultDetails: true,
      integration: {
        select: { integrationId: true, id: true, lastRunAt: true },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  // Only include results from the most recent scan window per integration.
  // Uses the LATER of `lastRunAt` and the per-integration max result
  // completedAt as the reference, so a missed `lastRunAt` advance doesn't
  // hide the newest legacy failures.
  const resultsForFilter = results.map((r) => ({
    ...r,
    integrationId: r.integration.id,
  }));
  const filtered = filterToLatestScanResults(resultsForFilter, lastRunMap);

  return filtered.map((result) => ({
    id: result.id,
    title: result.title,
    description: result.description,
    remediation: result.remediation,
    status: result.status,
    severity: result.severity,
    completedAt: result.completedAt,
    connectionId: result.integration.id,
    providerSlug: result.integration.integrationId,
    serviceId: null,
    findingKey: null,
    resourceId: null,
    // Legacy IntegrationResult model has neither resourceType nor checkId
    resourceType: null,
    checkId: null,
    checkKey: null,
    evidence: sanitizeEvidence(result.resultDetails ?? null),
    projectDisplayName: null,
    integration: { integrationId: result.integration.integrationId },
  }));
}

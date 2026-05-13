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
const SCAN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

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
  const filtered = results.filter((result) => {
    const lastRunAt = lastRunMap.get(result.integration.id);
    if (!lastRunAt) return result.completedAt !== null;
    if (!result.completedAt) return false;

    const lastRunTime = lastRunAt.getTime();
    const completedTime = result.completedAt.getTime();
    return (
      completedTime <= lastRunTime &&
      completedTime >= lastRunTime - SCAN_WINDOW_MS
    );
  });

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

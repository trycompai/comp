import { Injectable } from '@nestjs/common';
import { db } from '@db';
import { getManifest } from '@trycompai/integration-platform';
import { sanitizeEvidence } from './evidence-sanitizer';
import { getLegacyFindings } from './cloud-security-query.legacy';
import { normalizeCheckId } from './check-definition.utils';
import type {
  CloudFinding,
  CloudProvider,
  CloudProviderLatestRun,
} from './cloud-security-query.types';

// Re-export so existing imports of CloudProvider/CloudFinding from the service
// path keep working (the controller imports them).
export type { CloudFinding, CloudProvider, CloudProviderLatestRun };

const CLOUD_PROVIDER_SLUGS = ['aws', 'gcp', 'azure'] as const;

/** Extract project ID from a GCP resource path like //iam.googleapis.com/projects/my-proj/... */
function extractProjectIdFromResource(
  resourceId: string | null,
): string | null {
  if (!resourceId) return null;
  const match = resourceId.match(/\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

/** Get required variables from manifest (both manifest-level and check-level) */
function getRequiredVariables(providerSlug: string): string[] {
  const manifest = getManifest(providerSlug);
  if (!manifest) return [];

  const requiredVars = new Set<string>();

  if (manifest.variables) {
    for (const variable of manifest.variables) {
      if (variable.required) requiredVars.add(variable.id);
    }
  }

  if (manifest.checks) {
    for (const check of manifest.checks) {
      if (check.variables) {
        for (const variable of check.variables) {
          if (variable.required) requiredVars.add(variable.id);
        }
      }
    }
  }

  return Array.from(requiredVars);
}

@Injectable()
export class CloudSecurityQueryService {
  async getProviders(organizationId: string): Promise<CloudProvider[]> {
    // Fetch from NEW integration platform
    const newConnections = await db.integrationConnection.findMany({
      where: {
        organizationId,
        status: 'active',
        provider: { slug: { in: [...CLOUD_PROVIDER_SLUGS] } },
      },
      include: { provider: true },
    });

    // Fetch from OLD integration table
    const legacyIntegrations = await db.integration.findMany({
      where: { organizationId },
    });

    const activeLegacy = legacyIntegrations.filter((i) =>
      (CLOUD_PROVIDER_SLUGS as readonly string[]).includes(i.integrationId),
    );

    // Per-connection latest scan summary for new-platform connections — one
    // query, distinct-by-connection so we get only the most recent run each.
    const latestRunByConnection = await this.getLatestRunsByConnection(
      newConnections.map((c) => c.id),
    );

    // Map new connections
    const newProviders: CloudProvider[] = newConnections.map((conn) => {
      const metadata = (conn.metadata || {}) as Record<string, unknown>;
      const manifest = getManifest(conn.provider.slug);
      const reconnectMarker = metadata.reconnectedAt;
      const reconnectedAt =
        typeof reconnectMarker === 'string' &&
        !Number.isNaN(new Date(reconnectMarker).getTime())
          ? new Date(reconnectMarker)
          : undefined;
      return {
        id: conn.id,
        integrationId: conn.provider.slug,
        name: conn.provider.name,
        displayName:
          typeof metadata.connectionName === 'string'
            ? metadata.connectionName
            : conn.provider.name,
        organizationId: conn.organizationId,
        lastRunAt: conn.lastSyncAt,
        status: conn.status,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
        reconnectedAt,
        isLegacy: false,
        variables: (conn.variables as Record<string, unknown>) ?? null,
        requiredVariables: getRequiredVariables(conn.provider.slug),
        accountId:
          typeof metadata.accountId === 'string'
            ? metadata.accountId
            : undefined,
        awsType:
          typeof metadata.awsType === 'string' ? metadata.awsType : undefined,
        regions: Array.isArray(metadata.regions)
          ? metadata.regions.filter((r): r is string => typeof r === 'string')
          : undefined,
        tenantId:
          typeof metadata.tenantId === 'string' ? metadata.tenantId : undefined,
        subscriptionId:
          typeof metadata.subscriptionId === 'string'
            ? metadata.subscriptionId
            : undefined,
        supportsMultipleConnections:
          manifest?.supportsMultipleConnections ?? false,
        latestRun: latestRunByConnection.get(conn.id) ?? null,
      };
    });

    // Map legacy integrations
    const legacyProviders: CloudProvider[] = activeLegacy.map((integration) => {
      const settings = (integration.settings || {}) as Record<string, unknown>;
      const manifest = getManifest(integration.integrationId);
      return {
        id: integration.id,
        integrationId: integration.integrationId,
        name: integration.name,
        displayName:
          typeof settings.connectionName === 'string'
            ? settings.connectionName
            : integration.name,
        organizationId: integration.organizationId,
        lastRunAt: integration.lastRunAt,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        isLegacy: true,
        variables: null,
        requiredVariables: getRequiredVariables(integration.integrationId),
        accountId:
          typeof settings.accountId === 'string'
            ? settings.accountId
            : undefined,
        awsType:
          typeof settings.awsType === 'string' ? settings.awsType : undefined,
        regions: Array.isArray(settings.regions)
          ? settings.regions.filter((r): r is string => typeof r === 'string')
          : undefined,
        tenantId:
          typeof settings.tenantId === 'string' ? settings.tenantId : undefined,
        subscriptionId:
          typeof settings.subscriptionId === 'string'
            ? settings.subscriptionId
            : undefined,
        supportsMultipleConnections:
          manifest?.supportsMultipleConnections ?? false,
        latestRun: integration.lastRunAt
          ? {
              completedAt: integration.lastRunAt,
              durationMs: null,
              totalChecked: null,
              passedCount: null,
              failedCount: null,
              status: 'success',
            }
          : null,
      };
    });

    return [...newProviders, ...legacyProviders];
  }

  async getFindings(
    organizationId: string,
    options: { includeExceptions?: boolean } = {},
  ): Promise<CloudFinding[]> {
    const [newFindings, legacyFindings] = await Promise.all([
      this.getNewPlatformFindings(organizationId),
      getLegacyFindings(organizationId),
    ]);

    const combined = [...newFindings, ...legacyFindings].sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });

    if (options.includeExceptions) return combined;

    // Filter out findings under an active (non-revoked, non-expired)
    // FindingException. Looked up in one query keyed by org so the cost
    // stays constant regardless of finding count.
    const activeExceptionKeys = await this.loadActiveExceptionKeys(organizationId);
    if (activeExceptionKeys.size === 0) return combined;

    return combined.filter((finding) => {
      if (!finding.checkKey || !finding.resourceId) return true;
      const key = `${finding.connectionId}::${finding.checkKey}::${finding.resourceId}`;
      return !activeExceptionKeys.has(key);
    });
  }

  /**
   * Return the set of (connectionId, checkId, resourceId) tuples that have
   * an active exception in this org. One DB query per getFindings call.
   */
  private async loadActiveExceptionKeys(
    organizationId: string,
  ): Promise<Set<string>> {
    const active = await db.findingException.findMany({
      where: {
        organizationId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { connectionId: true, checkId: true, resourceId: true },
    });
    return new Set(
      active.map((e) => `${e.connectionId}::${e.checkId}::${e.resourceId}`),
    );
  }

  private async getLatestRunsByConnection(
    connectionIds: string[],
  ): Promise<Map<string, CloudProviderLatestRun>> {
    if (connectionIds.length === 0) return new Map();

    const runs = await db.integrationCheckRun.findMany({
      where: {
        connectionId: { in: connectionIds },
        status: { in: ['success', 'failed'] },
      },
      orderBy: { completedAt: 'desc' },
      distinct: ['connectionId'],
      select: {
        connectionId: true,
        completedAt: true,
        durationMs: true,
        totalChecked: true,
        passedCount: true,
        failedCount: true,
        status: true,
      },
    });

    const map = new Map<string, CloudProviderLatestRun>();
    for (const run of runs) {
      map.set(run.connectionId, {
        completedAt: run.completedAt,
        durationMs: run.durationMs,
        totalChecked: run.totalChecked,
        passedCount: run.passedCount,
        failedCount: run.failedCount,
        status: run.status,
      });
    }
    return map;
  }

  private async getNewPlatformFindings(
    organizationId: string,
  ): Promise<CloudFinding[]> {
    const connections = await db.integrationConnection.findMany({
      where: {
        organizationId,
        status: 'active',
        provider: { slug: { in: [...CLOUD_PROVIDER_SLUGS] } },
      },
      include: { provider: true },
    });

    const connectionIds = connections.map((c) => c.id);
    if (connectionIds.length === 0) return [];

    const connectionToSlug = Object.fromEntries(
      connections.map((c) => [c.id, c.provider.slug]),
    );

    // Build project ID → name map from all GCP connections
    const projectNameMap = new Map<string, string>();
    for (const conn of connections) {
      const vars = (conn.variables ?? {}) as Record<string, unknown>;
      const names = vars.project_names as Record<string, string> | undefined;
      if (names) {
        for (const [id, name] of Object.entries(names)) {
          projectNameMap.set(id, name);
        }
      }
    }

    const latestRuns = await db.integrationCheckRun.findMany({
      where: {
        connectionId: { in: connectionIds },
        status: { in: ['success', 'failed'] },
      },
      orderBy: { completedAt: 'desc' },
      distinct: ['connectionId'],
      select: {
        id: true,
        connectionId: true,
        status: true,
        checkId: true,
      },
    });

    const latestRunIds = latestRuns.map((r) => r.id);
    if (latestRunIds.length === 0) return [];

    const checkRunMap = Object.fromEntries(latestRuns.map((cr) => [cr.id, cr]));

    const results = await db.integrationCheckResult.findMany({
      where: { checkRunId: { in: latestRunIds } },
      select: {
        id: true,
        title: true,
        description: true,
        remediation: true,
        severity: true,
        collectedAt: true,
        checkRunId: true,
        passed: true,
        evidence: true,
        resourceId: true,
        resourceType: true,
      },
      orderBy: { collectedAt: 'desc' },
    });

    return results.map((result) => {
      const checkRun = checkRunMap[result.checkRunId];
      const slug = checkRun
        ? connectionToSlug[checkRun.connectionId] || 'unknown'
        : 'unknown';
      const rawEvidence = (result.evidence ?? {}) as Record<string, unknown>;
      // Read service/finding hints from raw evidence BEFORE sanitization — these
      // are non-sensitive metadata fields the UI groups and filters by.
      const serviceId = (rawEvidence.serviceId as string) ?? null;
      const findingKey = (rawEvidence.findingKey as string) ?? null;
      const projectDisplayNameFromEvidence = rawEvidence.projectDisplayName as
        | string
        | undefined;
      return {
        id: result.id,
        title: result.title,
        description: result.description,
        remediation: result.remediation,
        status: result.passed ? 'passed' : 'failed',
        severity: result.severity,
        completedAt: result.collectedAt,
        connectionId: checkRun?.connectionId ?? '',
        providerSlug: slug,
        serviceId,
        findingKey,
        resourceId: result.resourceId ?? null,
        resourceType: result.resourceType ?? null,
        checkId: checkRun?.checkId ?? null,
        checkKey: findingKey
          ? normalizeCheckId(findingKey, result.resourceId)
          : null,
        evidence: sanitizeEvidence(result.evidence ?? null),
        projectDisplayName: (() => {
          if (projectDisplayNameFromEvidence) {
            return projectDisplayNameFromEvidence;
          }
          const projectId = extractProjectIdFromResource(result.resourceId);
          if (!projectId) return null;
          return projectNameMap.get(projectId) ?? projectId;
        })(),
        integration: { integrationId: slug },
      };
    });
  }
}

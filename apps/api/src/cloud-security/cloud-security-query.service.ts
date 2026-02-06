import { Injectable } from '@nestjs/common';
import { db } from '@db';
import { getManifest } from '@comp/integration-platform';

const CLOUD_PROVIDER_CATEGORY = 'Cloud';

/** Scan window for filtering legacy results to latest scan only */
const SCAN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export interface CloudProvider {
  id: string;
  integrationId: string;
  name: string;
  displayName?: string;
  organizationId: string;
  lastRunAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  isLegacy: boolean;
  variables: Record<string, unknown> | null;
  requiredVariables: string[];
  accountId?: string;
  regions?: string[];
  supportsMultipleConnections?: boolean;
}

export interface CloudFinding {
  id: string;
  title: string | null;
  description: string | null;
  remediation: string | null;
  status: string | null;
  severity: string | null;
  completedAt: Date | null;
  connectionId: string;
  providerSlug: string;
  integration: { integrationId: string };
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
        provider: { category: CLOUD_PROVIDER_CATEGORY },
      },
      include: { provider: true },
    });

    // Fetch from OLD integration table
    const legacyIntegrations = await db.integration.findMany({
      where: { organizationId },
    });

    const activeLegacy = legacyIntegrations.filter((i) => {
      const manifest = getManifest(i.integrationId);
      return manifest?.category === CLOUD_PROVIDER_CATEGORY;
    });

    // Map new connections
    const newProviders: CloudProvider[] = newConnections.map((conn) => {
      const metadata = (conn.metadata || {}) as Record<string, unknown>;
      const manifest = getManifest(conn.provider.slug);
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
        isLegacy: false,
        variables: (conn.variables as Record<string, unknown>) ?? null,
        requiredVariables: getRequiredVariables(conn.provider.slug),
        accountId:
          typeof metadata.accountId === 'string'
            ? metadata.accountId
            : undefined,
        regions: Array.isArray(metadata.regions)
          ? metadata.regions.filter(
              (r): r is string => typeof r === 'string',
            )
          : undefined,
        supportsMultipleConnections:
          manifest?.supportsMultipleConnections ?? false,
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
        regions: Array.isArray(settings.regions)
          ? settings.regions.filter(
              (r): r is string => typeof r === 'string',
            )
          : undefined,
        supportsMultipleConnections:
          manifest?.supportsMultipleConnections ?? false,
      };
    });

    return [...newProviders, ...legacyProviders];
  }

  async getFindings(organizationId: string): Promise<CloudFinding[]> {
    const newFindings = await this.getNewPlatformFindings(organizationId);
    const legacyFindings = await this.getLegacyFindings(organizationId);

    return [...newFindings, ...legacyFindings].sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  private async getNewPlatformFindings(
    organizationId: string,
  ): Promise<CloudFinding[]> {
    const connections = await db.integrationConnection.findMany({
      where: {
        organizationId,
        status: 'active',
        provider: { category: CLOUD_PROVIDER_CATEGORY },
      },
      include: { provider: true },
    });

    const connectionIds = connections.map((c) => c.id);
    if (connectionIds.length === 0) return [];

    const connectionToSlug = Object.fromEntries(
      connections.map((c) => [c.id, c.provider.slug]),
    );

    const latestRuns = await db.integrationCheckRun.findMany({
      where: {
        connectionId: { in: connectionIds },
        status: { in: ['success', 'failed'] },
      },
      orderBy: { completedAt: 'desc' },
      distinct: ['connectionId'],
      select: { id: true, connectionId: true, status: true },
    });

    const latestRunIds = latestRuns.map((r) => r.id);
    if (latestRunIds.length === 0) return [];

    const checkRunMap = Object.fromEntries(
      latestRuns.map((cr) => [cr.id, cr]),
    );

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
      },
      orderBy: { collectedAt: 'desc' },
    });

    return results.map((result) => {
      const checkRun = checkRunMap[result.checkRunId];
      const slug = checkRun
        ? connectionToSlug[checkRun.connectionId] || 'unknown'
        : 'unknown';
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
        integration: { integrationId: slug },
      };
    });
  }

  private async getLegacyFindings(
    organizationId: string,
  ): Promise<CloudFinding[]> {
    const legacyIntegrations = await db.integration.findMany({
      where: { organizationId },
    });

    const activeLegacy = legacyIntegrations.filter((i) => {
      const manifest = getManifest(i.integrationId);
      return manifest?.category === CLOUD_PROVIDER_CATEGORY;
    });

    const legacyIds = activeLegacy.map((i) => i.id);
    if (legacyIds.length === 0) return [];

    const lastRunMap = new Map(
      activeLegacy
        .filter((i) => i.lastRunAt)
        .map((i) => [i.id, i.lastRunAt!]),
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
        integration: {
          select: { integrationId: true, id: true, lastRunAt: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Filter to only include results from the most recent scan
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
      integration: { integrationId: result.integration.integrationId },
    }));
  }
}

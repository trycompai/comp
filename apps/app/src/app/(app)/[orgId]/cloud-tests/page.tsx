import { auth as betterAuth } from '@/utils/auth';
import { getManifest } from '@comp/integration-platform';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TestsLayout } from './components/TestsLayout';
import { CLOUD_PROVIDER_CATEGORY } from './constants';

// Get required variables from manifest (both manifest-level and check-level)
const getRequiredVariables = (providerSlug: string): string[] => {
  const manifest = getManifest(providerSlug);
  if (!manifest) return [];

  const requiredVars = new Set<string>();

  // Check manifest-level variables
  if (manifest.variables) {
    for (const variable of manifest.variables) {
      if (variable.required) {
        requiredVars.add(variable.id);
      }
    }
  }

  // Check check-level variables
  if (manifest.checks) {
    for (const check of manifest.checks) {
      if (check.variables) {
        for (const variable of check.variables) {
          if (variable.required) {
            requiredVars.add(variable.id);
          }
        }
      }
    }
  }

  return Array.from(requiredVars);
};

export default async function CloudTestsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const session = await betterAuth.api.getSession({
    headers: await headers(),
  });

  // Check person belongs to organization
  const member = await db.member.findFirst({
    where: {
      userId: session?.user.id,
      organizationId: orgId,
    },
  });

  if (!member) {
    redirect('/');
  }

  // ====================================================================
  // Fetch from NEW integration platform (IntegrationConnection)
  // ====================================================================
  const newConnections = await db.integrationConnection.findMany({
    where: {
      organizationId: orgId,
      status: 'active',
      provider: {
        category: CLOUD_PROVIDER_CATEGORY,
      },
    },
    include: {
      provider: true,
    },
  });

  // ====================================================================
  // Fetch from OLD integration table (Integration) - for backward compat
  // ====================================================================
  const legacyIntegrations = await db.integration.findMany({
    where: {
      organizationId: orgId,
    },
  });

  // Filter legacy integrations to cloud providers only
  // NOTE: We now allow BOTH legacy and new connections to coexist for providers
  // that support multiple connections (e.g., AWS with multiple accounts)
  const activeLegacyIntegrations = legacyIntegrations.filter((integration) => {
    const manifest = getManifest(integration.integrationId);
    return manifest?.category === CLOUD_PROVIDER_CATEGORY;
  });

  // ====================================================================
  // Merge providers from both sources
  // ====================================================================
  type Provider = {
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
  };

  const newProviders: Provider[] = newConnections.map((conn) => {
    const metadata = (conn.metadata || {}) as Record<string, unknown>;
    const displayName =
      typeof metadata.connectionName === 'string' ? metadata.connectionName : conn.provider.name;
    const accountId = typeof metadata.accountId === 'string' ? metadata.accountId : undefined;
    const regions = Array.isArray(metadata.regions)
      ? metadata.regions.filter((region): region is string => typeof region === 'string')
      : undefined;
    const manifest = getManifest(conn.provider.slug);

    return {
      id: conn.id,
      integrationId: conn.provider.slug,
      name: conn.provider.name,
      displayName,
      organizationId: conn.organizationId,
      lastRunAt: conn.lastSyncAt,
      status: conn.status,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      isLegacy: false,
      variables: (conn.variables as Record<string, unknown>) ?? null,
      requiredVariables: getRequiredVariables(conn.provider.slug),
      accountId,
      regions,
      supportsMultipleConnections: manifest?.supportsMultipleConnections ?? false,
    };
  });

  const legacyProviders: Provider[] = activeLegacyIntegrations.map((integration) => {
    const settings = (integration.settings || {}) as Record<string, unknown>;
    const displayName =
      typeof settings.connectionName === 'string' ? settings.connectionName : integration.name;
    const accountId = typeof settings.accountId === 'string' ? settings.accountId : undefined;
    const regions = Array.isArray(settings.regions)
      ? settings.regions.filter((region): region is string => typeof region === 'string')
      : undefined;
    const manifest = getManifest(integration.integrationId);

    return {
      id: integration.id,
      integrationId: integration.integrationId,
      name: integration.name,
      displayName,
      organizationId: integration.organizationId,
      lastRunAt: integration.lastRunAt,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      isLegacy: true,
      variables: null,
      requiredVariables: getRequiredVariables(integration.integrationId),
      accountId,
      regions,
      supportsMultipleConnections: manifest?.supportsMultipleConnections ?? false,
    };
  });

  const providers: Provider[] = [...newProviders, ...legacyProviders];

  // ====================================================================
  // Fetch findings from NEW platform (IntegrationCheckResult)
  // ====================================================================
  const newConnectionIds = newConnections.map((c) => c.id);
  const connectionToSlug = Object.fromEntries(newConnections.map((c) => [c.id, c.provider.slug]));

  // Get the latest check run for each connection
  const latestRuns =
    newConnectionIds.length > 0
      ? await db.integrationCheckRun.findMany({
          where: {
            connectionId: { in: newConnectionIds },
            status: { in: ['success', 'failed'] },
          },
          orderBy: { completedAt: 'desc' },
          distinct: ['connectionId'],
          select: { id: true, connectionId: true, status: true },
        })
      : [];

  const latestRunIds = latestRuns.map((r) => r.id);
  const checkRunMap = Object.fromEntries(latestRuns.map((cr) => [cr.id, cr]));

  // Fetch results only from the latest runs (both passed and failed)
  const newResults =
    latestRunIds.length > 0
      ? await db.integrationCheckResult.findMany({
          where: {
            checkRunId: { in: latestRunIds },
          },
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
          orderBy: {
            collectedAt: 'desc',
          },
        })
      : [];

  const newFindings = newResults.map((result) => {
    const checkRun = checkRunMap[result.checkRunId];
    return {
      id: result.id,
      title: result.title,
      description: result.description,
      remediation: result.remediation,
      status: result.passed ? 'passed' : 'failed',
      severity: result.severity,
      completedAt: result.collectedAt,
      connectionId: checkRun?.connectionId ?? '',
      providerSlug: checkRun ? connectionToSlug[checkRun.connectionId] || 'unknown' : 'unknown',
      integration: {
        integrationId: checkRun ? connectionToSlug[checkRun.connectionId] || 'unknown' : 'unknown',
      },
    };
  });

  // ====================================================================
  // Fetch findings from OLD platform (IntegrationResult)
  // Only show results from the most recent scan for each integration
  // ====================================================================
  const legacyIntegrationIds = activeLegacyIntegrations.map((i) => i.id);

  // Create a map of integration ID to lastRunAt for filtering
  const integrationLastRunMap = new Map(
    activeLegacyIntegrations
      .filter((i) => i.lastRunAt)
      .map((i) => [i.id, i.lastRunAt!]),
  );

  const legacyResults =
    legacyIntegrationIds.length > 0
      ? await db.integrationResult.findMany({
          where: {
            integrationId: {
              in: legacyIntegrationIds,
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            remediation: true,
            status: true,
            severity: true,
            completedAt: true,
            integration: {
              select: {
                integrationId: true,
                id: true,
                lastRunAt: true,
              },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
        })
      : [];

  // Filter to only include results from the most recent scan
  // Results are considered from the "latest scan" if they were completed
  // within 10 minutes BEFORE the integration's lastRunAt (one-sided window)
  // This matches the maxDuration of the sendIntegrationResults task (10 minutes)
  // This prevents including results from previous scans
  const SCAN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  const filteredLegacyResults = legacyResults.filter((result) => {
    const lastRunAt = integrationLastRunMap.get(result.integration.id);
    
    // If no lastRunAt (old integration or never scanned), show all results with completedAt
    // This preserves backward compatibility
    if (!lastRunAt) {
      return result.completedAt !== null;
    }
    
    if (!result.completedAt) return false;

    const lastRunTime = lastRunAt.getTime();
    const completedTime = result.completedAt.getTime();

    // Include if completed within the scan window BEFORE lastRunAt
    // (results should be from the scan that just completed, not future or old scans)
    return completedTime <= lastRunTime && completedTime >= lastRunTime - SCAN_WINDOW_MS;
  });

  const legacyFindings = filteredLegacyResults.map((result) => ({
    id: result.id,
    title: result.title,
    description: result.description,
    remediation: result.remediation,
    status: result.status,
    severity: result.severity,
    completedAt: result.completedAt,
    connectionId: result.integration.id,
    providerSlug: result.integration.integrationId,
    integration: {
      integrationId: result.integration.integrationId,
    },
  }));

  // ====================================================================
  // Merge all findings and sort by date
  // ====================================================================
  const findings = [...newFindings, ...legacyFindings].sort((a, b) => {
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return dateB - dateA;
  });

  return <TestsLayout initialFindings={findings} initialProviders={providers} orgId={orgId} />;
}

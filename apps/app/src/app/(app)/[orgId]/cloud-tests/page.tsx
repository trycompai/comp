import { auth as betterAuth } from '@/utils/auth';
import { getManifest } from '@comp/integration-platform';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TestsLayout } from './components/TestsLayout';

const CLOUD_PROVIDER_SLUGS = ['aws', 'gcp', 'azure'];

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
        slug: {
          in: CLOUD_PROVIDER_SLUGS,
        },
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
      integrationId: {
        in: CLOUD_PROVIDER_SLUGS,
      },
    },
  });

  // Filter out legacy integrations that have been migrated to new platform
  const newConnectionSlugs = new Set(newConnections.map((c) => c.provider.slug));
  const activeLegacyIntegrations = legacyIntegrations.filter(
    (i) => !newConnectionSlugs.has(i.integrationId),
  );

  // ====================================================================
  // Merge providers from both sources
  // ====================================================================
  type Provider = {
    id: string;
    integrationId: string;
    name: string;
    organizationId: string;
    lastRunAt: Date | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    isLegacy: boolean;
    variables: Record<string, unknown> | null;
    requiredVariables: string[];
  };

  const newProviders: Provider[] = newConnections.map((conn) => ({
    id: conn.id,
    integrationId: conn.provider.slug,
    name: conn.provider.name,
    organizationId: conn.organizationId,
    lastRunAt: conn.lastSyncAt,
    status: conn.status,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
    isLegacy: false,
    variables: (conn.variables as Record<string, unknown>) ?? null,
    requiredVariables: getRequiredVariables(conn.provider.slug),
  }));

  const legacyProviders: Provider[] = activeLegacyIntegrations.map((integration) => ({
    id: integration.id,
    integrationId: integration.integrationId,
    name: integration.name,
    organizationId: integration.organizationId,
    lastRunAt: integration.lastRunAt,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    isLegacy: true,
    variables: null,
    requiredVariables: getRequiredVariables(integration.integrationId),
  }));

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
      integration: {
        integrationId: checkRun ? connectionToSlug[checkRun.connectionId] || 'unknown' : 'unknown',
      },
    };
  });

  // ====================================================================
  // Fetch findings from OLD platform (IntegrationResult)
  // ====================================================================
  const legacyIntegrationIds = activeLegacyIntegrations.map((i) => i.id);

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
              },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
          take: 500,
        })
      : [];

  const legacyFindings = legacyResults.map((result) => ({
    id: result.id,
    title: result.title,
    description: result.description,
    remediation: result.remediation,
    status: result.status,
    severity: result.severity,
    completedAt: result.completedAt,
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

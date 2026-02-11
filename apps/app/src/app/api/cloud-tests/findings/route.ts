import { CLOUD_PROVIDER_CATEGORY } from '@/app/(app)/[orgId]/cloud-tests/constants';
import { auth } from '@/utils/auth';
import { getManifest } from '@comp/integration-platform';
import { db } from '@db/server';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify the user belongs to the requested organization
    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: orgId,
        deactivated: false,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ====================================================================
    // Fetch from NEW integration platform
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

    // Filter legacy integrations to only include cloud providers
    // NOTE: We now allow BOTH legacy and new connections to coexist for the same provider
    // This supports organizations migrating gradually (e.g., adding new AWS accounts while keeping old ones)
    const activeLegacyIntegrations = legacyIntegrations.filter((integration) => {
      const manifest = getManifest(integration.integrationId);
      return manifest?.category === CLOUD_PROVIDER_CATEGORY;
    });

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
          integrationId: checkRun
            ? connectionToSlug[checkRun.connectionId] || 'unknown'
            : 'unknown',
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

    return NextResponse.json(findings);
  } catch (error) {
    console.error('Error fetching findings:', error);
    return NextResponse.json({ error: 'Failed to fetch findings' }, { status: 500 });
  }
}

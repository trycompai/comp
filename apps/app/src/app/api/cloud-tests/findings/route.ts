import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const CLOUD_PROVIDER_SLUGS = ['aws', 'gcp', 'azure'];

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const orgId = session?.session.activeOrganizationId;

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ====================================================================
    // Fetch from NEW integration platform
    // ====================================================================
    const newConnections = await db.integrationConnection.findMany({
      where: {
        organizationId: orgId,
        provider: {
          slug: {
            in: CLOUD_PROVIDER_SLUGS,
          },
        },
      },
      select: {
        id: true,
        provider: {
          select: {
            slug: true,
          },
        },
      },
    });

    const newConnectionIds = newConnections.map((c) => c.id);
    const connectionToSlug = Object.fromEntries(
      newConnections.map((c) => [c.id, c.provider.slug]),
    );

    // Fetch new findings
    const newResults =
      newConnectionIds.length > 0
        ? await db.integrationCheckResult.findMany({
            where: {
              checkRun: {
                connectionId: {
                  in: newConnectionIds,
                },
              },
              passed: false,
            },
            select: {
              id: true,
              title: true,
              description: true,
              remediation: true,
              severity: true,
              collectedAt: true,
              checkRunId: true,
            },
            orderBy: {
              collectedAt: 'desc',
            },
            take: 500,
          })
        : [];

    const checkRunIds = [...new Set(newResults.map((r) => r.checkRunId))];
    const checkRuns =
      checkRunIds.length > 0
        ? await db.integrationCheckRun.findMany({
            where: { id: { in: checkRunIds } },
            select: { id: true, connectionId: true, status: true },
          })
        : [];
    const checkRunMap = Object.fromEntries(checkRuns.map((cr) => [cr.id, cr]));

    const newFindings = newResults.map((result) => {
      const checkRun = checkRunMap[result.checkRunId];
      return {
        id: result.id,
        title: result.title,
        description: result.description,
        remediation: result.remediation,
        status: checkRun?.status === 'success' ? 'resolved' : 'open',
        severity: result.severity,
        completedAt: result.collectedAt,
        integration: {
          integrationId: checkRun ? connectionToSlug[checkRun.connectionId] || 'unknown' : 'unknown',
        },
      };
    });

    // ====================================================================
    // Fetch from OLD integration platform
    // ====================================================================
    // Filter out cloud providers that have migrated to new platform
    const newConnectionSlugs = new Set(newConnections.map((c) => c.provider.slug));
    const legacySlugs = CLOUD_PROVIDER_SLUGS.filter((s) => !newConnectionSlugs.has(s));

    const legacyResults =
      legacySlugs.length > 0
        ? await db.integrationResult.findMany({
            where: {
              organizationId: orgId,
              integration: {
                integrationId: {
                  in: legacySlugs,
                },
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
    // Merge and sort by date
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

import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const CLOUD_PROVIDER_SLUGS = ['aws', 'gcp', 'azure'];

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

    // Fetch only failed results from the latest runs (findings only, no passing results)
    const newResults =
      latestRunIds.length > 0
        ? await db.integrationCheckResult.findMany({
            where: {
              checkRunId: { in: latestRunIds },
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
          })
        : [];

    const newFindings = newResults.map((result) => {
      const checkRun = checkRunMap[result.checkRunId];
      return {
        id: result.id,
        title: result.title,
        description: result.description,
        remediation: result.remediation,
        status: 'failed',
        severity: result.severity,
        completedAt: result.collectedAt,
        integration: {
          integrationId: checkRun
            ? connectionToSlug[checkRun.connectionId] || 'unknown'
            : 'unknown',
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

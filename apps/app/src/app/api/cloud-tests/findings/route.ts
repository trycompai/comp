import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const orgId = session?.session.activeOrganizationId;

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const findings =
      (await db.integrationResult.findMany({
        where: {
          organizationId: orgId,
          integration: {
            integrationId: {
              in: ['aws', 'gcp', 'azure'],
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
      })) || [];

    return NextResponse.json(findings);
  } catch (error) {
    console.error('Error fetching findings:', error);
    return NextResponse.json({ error: 'Failed to fetch findings' }, { status: 500 });
  }
}

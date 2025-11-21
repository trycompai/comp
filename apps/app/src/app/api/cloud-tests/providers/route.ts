import { db } from '@/lib/db';
import { auth } from '@/utils/auth';
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

    const providers =
      (await db.integration.findMany({
        where: {
          organizationId: orgId,
          integrationId: {
            in: ['aws', 'gcp', 'azure'],
          },
        },
      })) || [];

    return NextResponse.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

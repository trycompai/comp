import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns all organizations the authenticated user belongs to.
 * Used by the device agent to register the device for all orgs.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await db.member.findMany({
      where: {
        userId: session.user.id,
        deactivated: false,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const organizations = memberships.map((m) => ({
      organizationId: m.organization.id,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      role: m.role,
    }));

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

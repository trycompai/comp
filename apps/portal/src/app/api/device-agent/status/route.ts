import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deviceId = req.nextUrl.searchParams.get('deviceId');
    const organizationId = req.nextUrl.searchParams.get('organizationId');

    if (!deviceId) {
      // Return all devices for this user, optionally filtered by org
      const devices = await db.device.findMany({
        where: {
          member: {
            userId: session.user.id,
            deactivated: false,
          },
          ...(organizationId ? { organizationId } : {}),
        },
        orderBy: { installedAt: 'desc' },
      });

      return NextResponse.json({ devices });
    }

    // Return a specific device
    const device = await db.device.findFirst({
      where: {
        id: deviceId,
        member: {
          userId: session.user.id,
          deactivated: false,
        },
      },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ device });
  } catch (error) {
    console.error('Error fetching device status:', error);
    return NextResponse.json({ error: 'Failed to fetch device status' }, { status: 500 });
  }
}

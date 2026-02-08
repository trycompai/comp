import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const registerDeviceSchema = z.object({
  name: z.string().min(1),
  hostname: z.string().min(1),
  platform: z.enum(['macos', 'windows', 'linux']),
  osVersion: z.string().min(1),
  serialNumber: z.string().optional(),
  hardwareModel: z.string().optional(),
  agentVersion: z.string().optional(),
  organizationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = registerDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, hostname, platform, osVersion, serialNumber, hardwareModel, agentVersion, organizationId } =
      parsed.data;

    // Verify the user is a member of the organization
    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        deactivated: false,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Branch on serialNumber to avoid collisions for serial-less devices.
    // PostgreSQL treats NULLs as distinct in unique constraints, so devices
    // without a serial number can safely coexist in the same org.
    let device;

    if (serialNumber) {
      // Serial number present — upsert on the unique (serialNumber, organizationId) key
      device = await db.device.upsert({
        where: {
          serialNumber_organizationId: {
            serialNumber,
            organizationId,
          },
        },
        update: {
          name,
          hostname,
          platform,
          osVersion,
          hardwareModel,
          agentVersion,
          userId: session.user.id,
        },
        create: {
          name,
          hostname,
          platform,
          osVersion,
          serialNumber,
          hardwareModel,
          agentVersion,
          userId: session.user.id,
          organizationId,
        },
      });
    } else {
      // No serial number — find by hostname + userId + org (same user re-registering
      // the same machine), or create a new record with serialNumber = null.
      const existing = await db.device.findFirst({
        where: {
          hostname,
          userId: session.user.id,
          organizationId,
          serialNumber: null,
        },
      });

      if (existing) {
        device = await db.device.update({
          where: { id: existing.id },
          data: {
            name,
            platform,
            osVersion,
            hardwareModel,
            agentVersion,
          },
        });
      } else {
        device = await db.device.create({
          data: {
            name,
            hostname,
            platform,
            osVersion,
            serialNumber: null,
            hardwareModel,
            agentVersion,
            userId: session.user.id,
            organizationId,
          },
        });
      }
    }

    return NextResponse.json({ deviceId: device.id });
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
  }
}

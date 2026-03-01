import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { randomUUID } from 'node:crypto';
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
      // Check if a device with this serial number already exists in the org
      const existing = await db.device.findUnique({
        where: {
          serialNumber_organizationId: {
            serialNumber,
            organizationId,
          },
        },
        select: { id: true, memberId: true },
      });

      if (existing && existing.memberId !== member.id) {
        // Serial number belongs to a different member. This happens when multiple
        // machines report the same generic serial (e.g. "System Serial Number",
        // "To Be Filled By O.E.M."). Instead of blocking, treat the serial as
        // unreliable and register with a generated fallback serial.
        // Format: "fallback:<originalSerial>:<uuid>" — self-documenting and unique.
        const fallback = await db.device.findFirst({
          where: {
            hostname,
            memberId: member.id,
            organizationId,
            serialNumber: { startsWith: `fallback:${serialNumber}:` },
          },
        });

        if (fallback) {
          device = await db.device.update({
            where: { id: fallback.id },
            data: { name, platform, osVersion, hardwareModel, agentVersion },
          });
        } else {
          const fallbackSerial = `fallback:${serialNumber}:${randomUUID()}`;
          device = await db.device.create({
            data: {
              name,
              hostname,
              platform,
              osVersion,
              serialNumber: fallbackSerial,
              hardwareModel,
              agentVersion,
              memberId: member.id,
              organizationId,
            },
          });
        }

        return NextResponse.json({ deviceId: device.id });
      }

      if (existing) {
        // Same member re-registering their own device — update it
        device = await db.device.update({
          where: { id: existing.id },
          data: {
            name,
            hostname,
            platform,
            osVersion,
            hardwareModel,
            agentVersion,
          },
        });
      } else {
        // New device — create it
        device = await db.device.create({
          data: {
            name,
            hostname,
            platform,
            osVersion,
            serialNumber,
            hardwareModel,
            agentVersion,
            memberId: member.id,
            organizationId,
          },
        });
      }
    } else {
      // No serial number — find by hostname + member + org (same user re-registering
      // the same machine), or create a new record with serialNumber = null.
      const existing = await db.device.findFirst({
        where: {
          hostname,
          memberId: member.id,
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
            memberId: member.id,
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

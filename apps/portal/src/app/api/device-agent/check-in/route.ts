import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@db';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkResultSchema = z.object({
  checkType: z.enum(['disk_encryption', 'antivirus', 'password_policy', 'screen_lock']),
  passed: z.boolean(),
  details: z
    .object({
      method: z.string().max(100),
      raw: z.string().max(2000),
      message: z.string().max(1000),
      exception: z.string().max(500).optional(),
    })
    .optional(),
  checkedAt: z.string().datetime(),
});

const checkInSchema = z.object({
  deviceId: z.string().min(1),
  checks: z.array(checkResultSchema).min(1),
  agentVersion: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { deviceId, checks, agentVersion } = parsed.data;

    // Verify the device belongs to an active member of the authenticated user
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

    // Build check fields from results
    const checkFields: Record<string, boolean> = {
      diskEncryptionEnabled: device.diskEncryptionEnabled,
      antivirusEnabled: device.antivirusEnabled,
      passwordPolicySet: device.passwordPolicySet,
      screenLockEnabled: device.screenLockEnabled,
    };

    const checkDetails: Record<string, unknown> = (device.checkDetails as Record<string, unknown>) ?? {};

    const checkTypeToField: Record<string, string> = {
      disk_encryption: 'diskEncryptionEnabled',
      antivirus: 'antivirusEnabled',
      password_policy: 'passwordPolicySet',
      screen_lock: 'screenLockEnabled',
    };

    for (const check of checks) {
      const field = checkTypeToField[check.checkType];
      if (field) {
        checkFields[field] = check.passed;
      }
      checkDetails[check.checkType] = {
        ...check.details,
        passed: check.passed,
        checkedAt: check.checkedAt,
      };
    }

    const isCompliant =
      checkFields.diskEncryptionEnabled &&
      checkFields.antivirusEnabled &&
      checkFields.passwordPolicySet &&
      checkFields.screenLockEnabled;

    const updatedDevice = await db.device.update({
      where: { id: deviceId },
      data: {
        ...checkFields,
        checkDetails: checkDetails as Prisma.InputJsonValue,
        isCompliant,
        lastCheckIn: new Date(),
        ...(agentVersion ? { agentVersion } : {}),
      },
      select: { isCompliant: true },
    });

    return NextResponse.json({
      isCompliant: updatedDevice.isCompliant,
      nextCheckIn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error processing device check-in:', error);
    return NextResponse.json({ error: 'Failed to process check-in' }, { status: 500 });
  }
}

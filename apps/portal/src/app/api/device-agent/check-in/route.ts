import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkResultSchema = z.object({
  checkType: z.enum(['disk_encryption', 'antivirus', 'password_policy', 'screen_lock']),
  passed: z.boolean(),
  details: z
    .object({
      method: z.string(),
      raw: z.string(),
      message: z.string(),
    })
    .optional(),
  checkedAt: z.string().datetime(),
});

const checkInSchema = z.object({
  deviceId: z.string().min(1),
  checks: z.array(checkResultSchema).min(1),
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

    const { deviceId, checks } = parsed.data;

    // Verify the device belongs to the authenticated user
    const device = await db.device.findFirst({
      where: {
        id: deviceId,
        userId: session.user.id,
      },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Delete old checks for the same types and create new ones
    const checkTypes = checks.map((c) => c.checkType);

    await db.$transaction(async (tx) => {
      // Remove previous checks of the same types for this device
      await tx.deviceCheck.deleteMany({
        where: {
          deviceId,
          checkType: { in: checkTypes },
        },
      });

      // Create new check results
      await tx.deviceCheck.createMany({
        data: checks.map((check) => ({
          deviceId,
          checkType: check.checkType,
          passed: check.passed,
          details: check.details ?? undefined,
          checkedAt: new Date(check.checkedAt),
        })),
      });

      // Compute overall compliance: all checks must pass
      const allChecks = await tx.deviceCheck.findMany({
        where: { deviceId },
      });

      const isCompliant = allChecks.length >= 4 && allChecks.every((c) => c.passed);

      await tx.device.update({
        where: { id: deviceId },
        data: {
          lastCheckIn: new Date(),
          isCompliant,
        },
      });
    });

    // Fetch updated device state
    const updatedDevice = await db.device.findUnique({
      where: { id: deviceId },
      select: { isCompliant: true },
    });

    return NextResponse.json({
      isCompliant: updatedDevice?.isCompliant ?? false,
      nextCheckIn: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    });
  } catch (error) {
    console.error('Error processing device check-in:', error);
    return NextResponse.json({ error: 'Failed to process check-in' }, { status: 500 });
  }
}

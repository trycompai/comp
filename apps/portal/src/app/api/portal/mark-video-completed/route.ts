import { auth } from '@/app/lib/auth';
import { env } from '@/env.mjs';
import { trainingVideos } from '@/lib/data/training-videos';
import { logger } from '@/utils/logger';
import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Derive training video IDs from the canonical source
const TRAINING_VIDEO_IDS = trainingVideos.map((v) => v.id);

const schema = z.object({
  videoId: z.string().min(1),
  organizationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { videoId, organizationId } = parsed.data;

  const member = await db.member.findFirstOrThrow({
    where: {
      userId: session.user.id,
      organizationId,
      deactivated: false,
    },
  });

  // Try to find existing record
  let record = await db.employeeTrainingVideoCompletion.findFirst({
    where: {
      videoId,
      memberId: member.id,
    },
  });

  if (!record) {
    record = await db.employeeTrainingVideoCompletion.create({
      data: {
        videoId,
        memberId: member.id,
        completedAt: new Date(),
      },
    });
  } else if (!record.completedAt) {
    record = await db.employeeTrainingVideoCompletion.update({
      where: { id: record.id },
      data: { completedAt: new Date() },
    });
  }

  // Check if all training videos are now complete
  const completions = await db.employeeTrainingVideoCompletion.findMany({
    where: {
      memberId: member.id,
      videoId: { in: TRAINING_VIDEO_IDS },
      completedAt: { not: null },
    },
  });

  const allTrainingComplete = completions.length === TRAINING_VIDEO_IDS.length;

  if (allTrainingComplete) {
    const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    const serviceToken = env.SERVICE_TOKEN_PORTAL;

    if (serviceToken) {
      try {
        await fetch(`${apiUrl}/v1/training/send-completion-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-token': serviceToken,
            'x-organization-id': organizationId,
          },
          body: JSON.stringify({
            memberId: member.id,
            organizationId,
          }),
        });
      } catch (error) {
        logger('Error calling training completion API', {
          error: error instanceof Error ? error.message : String(error),
          memberId: member.id,
        });
      }
    }
  }

  return NextResponse.json({ success: true, data: record });
}

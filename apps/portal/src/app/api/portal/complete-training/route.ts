import { auth } from '@/app/lib/auth';
import { env } from '@/env.mjs';
import { HIPAA_TRAINING_ID } from '@/lib/data/hipaa-training-content';
import { trainingVideos } from '@/lib/data/training-videos';
import { logger } from '@/utils/logger';
import { db } from '@db/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Canonical training video IDs, derived from the same source the UI renders.
const GENERAL_TRAINING_IDS = trainingVideos.map((v) => v.id);
const VALID_VIDEO_IDS = new Set<string>([
  ...GENERAL_TRAINING_IDS,
  HIPAA_TRAINING_ID,
]);

const schema = z.object({
  videoId: z.string().min(1),
  organizationId: z.string().min(1),
});

/**
 * Marks a single training video complete for the authenticated employee.
 *
 * Portal self-service (signing policies, completing training) is authorized by
 * session + organization membership, NOT by the org RBAC role — mirroring
 * `accept-policies`. Employees on custom roles that lack `portal:update` (e.g.
 * roles created via the API, or before the compliance-obligation auto-grant)
 * must still be able to complete their own training, which is why this does not
 * go through the RBAC-gated NestJS `/v1/training/completions/:id/complete`.
 */
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

  if (!VALID_VIDEO_IDS.has(videoId)) {
    return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
  }

  // Verify the authenticated user is an active member of the organization.
  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      deactivated: false,
    },
  });

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // HIPAA training is only available to orgs that have the HIPAA framework
  // enabled. Mirror the NestJS training service (markVideoComplete) so this
  // route can't create HIPAA completion records — and trigger HIPAA
  // certificate artifacts — for orgs the service would reject, which would
  // desync the two completion paths.
  if (videoId === HIPAA_TRAINING_ID) {
    const hipaaInstance = await db.frameworkInstance.findFirst({
      where: { organizationId, framework: { name: 'HIPAA' } },
      select: { id: true },
    });
    if (!hipaaInstance) {
      return NextResponse.json(
        { error: 'HIPAA training is not available for this organization' },
        { status: 400 },
      );
    }
  }

  let record = await db.employeeTrainingVideoCompletion.findFirst({
    where: { videoId, memberId: member.id },
  });

  if (!record) {
    record = await db.employeeTrainingVideoCompletion.create({
      data: { videoId, memberId: member.id, completedAt: new Date() },
    });
  } else if (!record.completedAt) {
    record = await db.employeeTrainingVideoCompletion.update({
      where: { id: record.id },
      data: { completedAt: new Date() },
    });
  }

  // Best-effort: trigger the completion certificate email once the relevant
  // training is fully done. Reuses the NestJS email pipeline via the portal
  // service token, so we don't duplicate the certificate/email logic here.
  await sendCompletionEmailIfComplete({
    videoId,
    memberId: member.id,
    organizationId,
  });

  return NextResponse.json({ success: true, data: record });
}

async function sendCompletionEmailIfComplete({
  videoId,
  memberId,
  organizationId,
}: {
  videoId: string;
  memberId: string;
  organizationId: string;
}): Promise<void> {
  const serviceToken = env.SERVICE_TOKEN_PORTAL;
  if (!serviceToken) return;

  const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

  try {
    if (videoId === HIPAA_TRAINING_ID) {
      await triggerCompletionEmail({
        url: `${apiUrl}/v1/training/send-hipaa-completion-email`,
        serviceToken,
        memberId,
        organizationId,
      });
      return;
    }

    // General training: only email once every video has been completed.
    const completed = await db.employeeTrainingVideoCompletion.findMany({
      where: {
        memberId,
        videoId: { in: GENERAL_TRAINING_IDS },
        completedAt: { not: null },
      },
      select: { id: true },
    });

    if (completed.length === GENERAL_TRAINING_IDS.length) {
      await triggerCompletionEmail({
        url: `${apiUrl}/v1/training/send-completion-email`,
        serviceToken,
        memberId,
        organizationId,
      });
    }
  } catch (error) {
    logger('Error triggering training completion email', {
      error: error instanceof Error ? error.message : String(error),
      memberId,
    });
  }
}

async function triggerCompletionEmail({
  url,
  serviceToken,
  memberId,
  organizationId,
}: {
  url: string;
  serviceToken: string;
  memberId: string;
  organizationId: string;
}): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-token': serviceToken,
      'x-organization-id': organizationId,
    },
    body: JSON.stringify({ memberId }),
  });
}

'use server';

import { authActionClient } from '@/actions/safe-action';
import { env } from '@/env.mjs';
import { trainingVideos } from '@/lib/data/training-videos';
import { logger } from '@/utils/logger';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

// Derive training video IDs from the canonical source
const TRAINING_VIDEO_IDS = trainingVideos.map((v) => v.id);

export const markVideoAsCompleted = authActionClient
  .inputSchema(z.object({ videoId: z.string(), organizationId: z.string() }))
  .metadata({
    name: 'markVideoAsCompleted',
    track: {
      event: 'markVideoAsCompleted',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { videoId, organizationId } = parsedInput;
    const { user } = ctx;

    logger('markVideoAsCompleted action started', {
      videoId,
      userId: user?.id,
    });

    if (!user) {
      logger('Unauthorized attempt to mark video as completed', { videoId });
      throw new Error('Unauthorized');
    }

    if (!organizationId) {
      logger('Organization ID not found', { userId: user.id });
      throw new Error('Organization ID not found');
    }

    const member = await db.member.findFirstOrThrow({
      where: {
        userId: user.id,
        organizationId: organizationId,
        deactivated: false,
      },
    });

    logger('Found member for marking video complete', {
      memberId: member.id,
      userId: user.id,
    });

    if (!member) {
      logger('Member not found', { userId: user.id });
      throw new Error('Member not found');
    }

    if (!member.organizationId) {
      logger('User does not have an organization', { userId: user.id });
      throw new Error('User does not have an organization');
    }

    // Try to find existing record
    let organizationTrainingVideo =
      await db.employeeTrainingVideoCompletion.findFirst({
        where: {
          videoId: videoId, // This is the metadata ID like 'sat-1'
          memberId: member.id,
        },
      });

    logger('Searched for existing video completion', {
      videoId,
      memberId: member.id,
      found: !!organizationTrainingVideo,
      existingId: organizationTrainingVideo?.id,
    });

    // If no record exists, create it
    if (!organizationTrainingVideo) {
      logger('Creating new video completion record', {
        videoId,
        memberId: member.id,
      });

      organizationTrainingVideo =
        await db.employeeTrainingVideoCompletion.create({
          data: {
            videoId,
            memberId: member.id,
            completedAt: new Date(), // Mark as completed immediately
          },
        });

      logger('Video completion record created and marked as completed', {
        videoId,
        userId: user.id,
      });
    } else {
      // Check if user has already completed this video
      if (organizationTrainingVideo.completedAt) {
        logger('User has already completed this video', {
          videoId,
          userId: user.id,
        });
        return organizationTrainingVideo;
      }

      logger('Updating video completion', { videoId, userId: user.id });
      organizationTrainingVideo =
        await db.employeeTrainingVideoCompletion.update({
          where: {
            id: organizationTrainingVideo.id,
          },
          data: {
            completedAt: new Date(),
          },
        });

      logger('Video successfully marked as completed', {
        videoId,
        userId: user.id,
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
      logger('All training videos completed, triggering certificate email via API', {
        memberId: member.id,
        userId: user.id,
      });

      // Call the API to send the completion email with certificate
      const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
      const serviceToken = env.SERVICE_TOKEN_PORTAL;

      if (!serviceToken) {
        logger('SERVICE_TOKEN_PORTAL not configured, skipping API call', {
          memberId: member.id,
        });
        return organizationTrainingVideo;
      }

      try {
        const response = await fetch(`${apiUrl}/v1/training/send-completion-email`, {
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

        if (response.ok) {
          const result = await response.json();
          if (result.sent) {
            logger('Training completion email sent successfully via API', {
              email: user.email,
              memberId: member.id,
            });
          } else {
            logger('API declined to send email', {
              reason: result.reason,
              memberId: member.id,
            });
          }
        } else {
          const errorText = await response.text();
          logger('Failed to send training completion email via API', {
            status: response.status,
            error: errorText,
            memberId: member.id,
          });
        }
      } catch (error) {
        // Log error but don't fail the action - video was still marked complete
        logger('Error calling training completion API', {
          error: error instanceof Error ? error.message : String(error),
          memberId: member.id,
        });
      }
    }

    // Revalidate path following cursor rules
    const headersList = await headers();
    let path =
      headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');
    revalidatePath(path);

    return organizationTrainingVideo;
  });

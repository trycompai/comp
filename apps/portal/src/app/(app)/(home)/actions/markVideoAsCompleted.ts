'use server';

import { authActionClient } from '@/actions/safe-action';
import { logger } from '@/utils/logger';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

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
    let organizationTrainingVideo = await db.employeeTrainingVideoCompletion.findFirst({
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

      organizationTrainingVideo = await db.employeeTrainingVideoCompletion.create({
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
      organizationTrainingVideo = await db.employeeTrainingVideoCompletion.update({
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

    // Revalidate path following cursor rules
    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');
    revalidatePath(path);

    return organizationTrainingVideo;
  });

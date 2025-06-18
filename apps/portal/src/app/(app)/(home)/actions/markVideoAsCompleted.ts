'use server';

import { authActionClient } from '@/actions/safe-action';
import { logger } from '@/utils/logger';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export const markVideoAsCompleted = authActionClient
  .inputSchema(z.object({ videoId: z.string() }))
  .metadata({
    name: 'markVideoAsCompleted',
    track: {
      event: 'markVideoAsCompleted',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { videoId } = parsedInput;
    const { user } = ctx;

    logger('markVideoAsCompleted action started', {
      videoId,
      userId: user?.id,
    });

    if (!user) {
      logger('Unauthorized attempt to mark video as completed', { videoId });
      throw new Error('Unauthorized');
    }

    const member = await db.member.findFirstOrThrow({
      where: {
        userId: user.id,
      },
    });

    if (!member) {
      logger('Member not found', { userId: user.id });
      throw new Error('Member not found');
    }

    if (!member.organizationId) {
      logger('User does not have an organization', { userId: user.id });
      throw new Error('User does not have an organization');
    }

    const organizationTrainingVideo = await db.employeeTrainingVideoCompletion.findUnique({
      where: {
        id: videoId,
        memberId: member.id,
      },
    });

    if (!organizationTrainingVideo) {
      logger('Training video not found', { videoId });
      throw new Error('Training video not found');
    }

    // Check if user has already signed this policy
    if (organizationTrainingVideo.completedAt) {
      logger('User has already signed this video', {
        videoId,
        userId: user.id,
      });
      return organizationTrainingVideo;
    }

    logger('Updating video completion', { videoId, userId: user.id });
    const completedVideo = await db.employeeTrainingVideoCompletion.update({
      where: { id: videoId, memberId: member.id },
      data: {
        completedAt: new Date(),
      },
    });

    logger('Video successfully marked as completed', {
      videoId,
      userId: user.id,
    });

    revalidatePath('/');

    return completedVideo;
  });

'use server';

import { authActionClient } from '@/actions/safe-action';
import { trainingVideos } from '@/lib/data/training-videos';
import { logger } from '@/utils/logger';
import { sendTrainingCompletedEmail } from '@comp/email';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { generateTrainingCertificatePdf } from './training-certificate';

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
      logger('All training videos completed, sending certificate email', {
        memberId: member.id,
        userId: user.id,
      });

      // Get organization name for the certificate
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });

      // Get the most recent completion date
      const mostRecentCompletion = completions.reduce((latest, current) => {
        if (!latest.completedAt) return current;
        if (!current.completedAt) return latest;
        return current.completedAt > latest.completedAt ? current : latest;
      });

      // Generate the certificate PDF
      const certificatePdf = await generateTrainingCertificatePdf({
        userName: user.name || 'Team Member',
        organizationName: organization?.name || 'Your Organization',
        completedAt: mostRecentCompletion.completedAt || new Date(),
      });

      // Send the email with certificate attached
      const emailResult = await sendTrainingCompletedEmail({
        email: user.email,
        userName: user.name || 'Team Member',
        organizationName: organization?.name || 'Your Organization',
        completedAt: mostRecentCompletion.completedAt || new Date(),
        certificatePdf,
      });

      if (emailResult.success) {
        logger('Training completion email sent successfully', {
          email: user.email,
          memberId: member.id,
          emailId: emailResult.id,
        });
      } else {
        // Log error but don't fail the action - video was still marked complete
        logger('Failed to send training completion email', {
          email: user.email,
          memberId: member.id,
        });
      }
    }

    // Revalidate path following cursor rules
    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');
    revalidatePath(path);

    return organizationTrainingVideo;
  });

'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { tasks } from '@trigger.dev/sdk';
import { logger } from '@/utils/logger';
import { z } from 'zod';

// Empty schema since this action doesn't need input
const deleteAllManualAnswersSchema = z.object({});

export const deleteAllManualAnswers = authActionClient
  .inputSchema(deleteAllManualAnswersSchema)
  .metadata({
    name: 'delete-all-manual-answers',
    track: {
      event: 'delete-all-manual-answers',
      description: 'Delete All Manual Answers',
      channel: 'server',
    },
  })
  .action(async ({ ctx }) => {
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      // First, get all manual answer IDs BEFORE deletion
      // This ensures the orchestrator has the IDs to delete from vector DB
      const manualAnswers = await db.securityQuestionnaireManualAnswer.findMany({
        where: {
          organizationId: activeOrganizationId,
        },
        select: {
          id: true,
        },
      });

      logger.info('Found manual answers to delete', {
        organizationId: activeOrganizationId,
        count: manualAnswers.length,
        ids: manualAnswers.map((ma) => ma.id),
      });

      // Trigger orchestrator task to delete all manual answers from vector DB in parallel
      // Pass the IDs directly to avoid race condition
      // This runs in the background and processes deletions efficiently
      if (manualAnswers.length > 0) {
        try {
          await tasks.trigger('delete-all-manual-answers-orchestrator', {
            organizationId: activeOrganizationId,
            manualAnswerIds: manualAnswers.map((ma) => ma.id), // Pass IDs directly
          });
          logger.info('Triggered delete all manual answers orchestrator task', {
            organizationId: activeOrganizationId,
            count: manualAnswers.length,
          });
        } catch (error) {
          // Log error but continue with DB deletion
          logger.warn('Failed to trigger delete all manual answers orchestrator', {
            organizationId: activeOrganizationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with DB deletion even if orchestrator trigger fails
        }
      } else {
        logger.info('No manual answers to delete', {
          organizationId: activeOrganizationId,
        });
      }

      // Delete all manual answers from main DB
      // Vector DB deletion happens in background via orchestrator
      await db.securityQuestionnaireManualAnswer.deleteMany({
        where: {
          organizationId: activeOrganizationId,
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      revalidatePath(`/${activeOrganizationId}/security-questionnaire/knowledge-base`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting all manual answers:', error);
      return {
        success: false,
        error: 'Failed to delete all manual answers',
      };
    }
  });


'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { tasks } from '@trigger.dev/sdk';
import { logger } from '@/utils/logger';

const deleteManualAnswerSchema = z.object({
  manualAnswerId: z.string(),
});

export const deleteManualAnswer = authActionClient
  .inputSchema(deleteManualAnswerSchema)
  .metadata({
    name: 'delete-manual-answer',
    track: {
      event: 'delete-manual-answer',
      description: 'Delete Manual Answer',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { manualAnswerId } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      // Verify manual answer exists and belongs to organization
      const manualAnswer = await db.securityQuestionnaireManualAnswer.findUnique({
        where: {
          id: manualAnswerId,
          organizationId: activeOrganizationId,
        },
      });

      if (!manualAnswer) {
        return {
          success: false,
          error: 'Manual answer not found',
        };
      }

      // Trigger Trigger.dev task to delete from vector DB in background
      // This runs asynchronously and doesn't block the main DB deletion
      try {
        await tasks.trigger('delete-manual-answer-from-vector', {
          manualAnswerId,
          organizationId: activeOrganizationId,
        });
        logger.info('Triggered delete manual answer from vector DB task', {
          manualAnswerId,
          organizationId: activeOrganizationId,
        });
      } catch (error) {
        // Log error but continue with DB deletion
        logger.warn('Failed to trigger delete manual answer from vector DB task', {
          manualAnswerId,
          organizationId: activeOrganizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with DB deletion even if task trigger fails
      }

      // Delete the manual answer from main DB
      await db.securityQuestionnaireManualAnswer.delete({
        where: {
          id: manualAnswerId,
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      revalidatePath(`/${activeOrganizationId}/questionnaire/knowledge-base`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting manual answer:', error);
      return {
        success: false,
        error: 'Failed to delete manual answer',
      };
    }
  });


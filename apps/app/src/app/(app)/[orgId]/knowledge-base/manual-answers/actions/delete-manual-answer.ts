'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

      // Delete the manual answer
      await db.securityQuestionnaireManualAnswer.delete({
        where: {
          id: manualAnswerId,
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      revalidatePath(`/${activeOrganizationId}/knowledge-base`);

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


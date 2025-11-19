'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export const deleteAllManualAnswers = authActionClient
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
      // Delete all manual answers for the organization
      await db.securityQuestionnaireManualAnswer.deleteMany({
        where: {
          organizationId: activeOrganizationId,
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
      console.error('Error deleting all manual answers:', error);
      return {
        success: false,
        error: 'Failed to delete all manual answers',
      };
    }
  });


'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const deleteQuestionnaireSchema = z.object({
  questionnaireId: z.string(),
});

export const deleteQuestionnaireAction = authActionClient
  .inputSchema(deleteQuestionnaireSchema)
  .metadata({
    name: 'delete-questionnaire',
    track: {
      event: 'delete-questionnaire',
      description: 'Delete Questionnaire',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { questionnaireId } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const questionnaire = await db.questionnaire.findUnique({
        where: {
          id: questionnaireId,
          organizationId: activeOrganizationId,
        },
      });

      if (!questionnaire) {
        return {
          success: false,
          error: 'Questionnaire not found',
        };
      }

      await db.questionnaire.delete({
        where: { id: questionnaireId },
      });

      revalidatePath(`/${activeOrganizationId}/questionnaire`);

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Failed to delete questionnaire',
      };
    }
  });


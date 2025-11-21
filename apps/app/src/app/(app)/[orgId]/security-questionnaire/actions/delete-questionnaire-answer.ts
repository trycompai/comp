'use server';

import { authActionClient } from '@/actions/safe-action';
import { db, Prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const deleteAnswerSchema = z.object({
  questionnaireId: z.string(),
  questionAnswerId: z.string(),
});

export const deleteQuestionnaireAnswer = authActionClient
  .inputSchema(deleteAnswerSchema)
  .metadata({
    name: 'delete-questionnaire-answer',
    track: {
      event: 'delete-questionnaire-answer',
      description: 'Delete Questionnaire Answer',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { questionnaireId, questionAnswerId } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      // Verify questionnaire exists and belongs to organization
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

      // Verify question answer exists and belongs to questionnaire
      const questionAnswer = await db.questionnaireQuestionAnswer.findUnique({
        where: {
          id: questionAnswerId,
          questionnaireId,
        },
      });

      if (!questionAnswer) {
        return {
          success: false,
          error: 'Question answer not found',
        };
      }

      // Delete the answer (set to null and status to untouched)
      await db.questionnaireQuestionAnswer.update({
        where: {
          id: questionAnswerId,
        },
        data: {
          answer: null,
          status: 'untouched',
          sources: Prisma.JsonNull,
          generatedAt: null,
          updatedBy: null,
          updatedAt: new Date(),
        },
      });

      // Update answered questions count
      const answeredCount = await db.questionnaireQuestionAnswer.count({
        where: {
          questionnaireId,
          answer: {
            not: null,
          },
        },
      });

      await db.questionnaire.update({
        where: {
          id: questionnaireId,
        },
        data: {
          answeredQuestions: answeredCount,
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting answer:', error);
      return {
        success: false,
        error: 'Failed to delete answer',
      };
    }
  });

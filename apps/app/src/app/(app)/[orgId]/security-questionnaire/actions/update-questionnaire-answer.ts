'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateAnswerSchema = z.object({
  questionnaireId: z.string(),
  questionAnswerId: z.string(),
  answer: z.string(),
});

export const updateQuestionnaireAnswer = authActionClient
  .inputSchema(updateAnswerSchema)
  .metadata({
    name: 'update-questionnaire-answer',
    track: {
      event: 'update-questionnaire-answer',
      description: 'Update Questionnaire Answer',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { questionnaireId, questionAnswerId, answer } = parsedInput;
    const { activeOrganizationId, userId } = ctx.session;

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

      // Update the answer
      await db.questionnaireQuestionAnswer.update({
        where: {
          id: questionAnswerId,
        },
        data: {
          answer: answer.trim() || null,
          status: 'manual',
          updatedBy: userId || null,
          updatedAt: new Date(),
        },
      });

      // Also save to SecurityQuestionnaireManualAnswer if answer exists
      if (answer && answer.trim().length > 0 && questionAnswer.question) {
        try {
          await db.securityQuestionnaireManualAnswer.upsert({
            where: {
              organizationId_question: {
                organizationId: activeOrganizationId,
                question: questionAnswer.question.trim(),
              },
            },
            create: {
              question: questionAnswer.question.trim(),
              answer: answer.trim(),
              tags: [],
              organizationId: activeOrganizationId,
              sourceQuestionnaireId: questionnaireId,
              createdBy: userId || null,
              updatedBy: userId || null,
            },
            update: {
              answer: answer.trim(),
              sourceQuestionnaireId: questionnaireId,
              updatedBy: userId || null,
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          // Log error but don't fail the main operation
          console.error('Error saving to manual answers:', error);
        }
      }

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
      console.error('Error updating answer:', error);
      return {
        success: false,
        error: 'Failed to update answer',
      };
    }
  });


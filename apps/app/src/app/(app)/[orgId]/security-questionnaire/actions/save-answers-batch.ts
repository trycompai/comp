'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const saveAnswersBatchSchema = z.object({
  questionnaireId: z.string(),
  answers: z.array(
    z.object({
      questionIndex: z.number(),
      answer: z.string().nullable(),
      sources: z
        .array(
          z.object({
            sourceType: z.string(),
            sourceName: z.string().optional(),
            sourceId: z.string().optional(),
            policyName: z.string().optional(),
            documentName: z.string().optional(),
            score: z.number(),
          }),
        )
        .optional(),
      status: z.enum(['generated', 'manual']),
    }),
  ),
});

export const saveAnswersBatchAction = authActionClient
  .inputSchema(saveAnswersBatchSchema)
  .metadata({
    name: 'save-questionnaire-answers-batch',
    track: {
      event: 'save-questionnaire-answers-batch',
      description: 'Save Questionnaire Answers Batch',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { questionnaireId, answers } = parsedInput;
    const { activeOrganizationId } = ctx.session;
    const userId = ctx.user.id;

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

      // Get all existing questions for this questionnaire
      const existingQuestions = await db.questionnaireQuestionAnswer.findMany({
        where: {
          questionnaireId,
        },
      });

      const existingQuestionsMap = new Map(
        existingQuestions.map((q) => [q.questionIndex, q]),
      );

      // Update or create answers
      const updatePromises = answers.map(async (answerData) => {
        const existing = existingQuestionsMap.get(answerData.questionIndex);

        if (existing) {
          // Update existing
          return db.questionnaireQuestionAnswer.update({
            where: {
              id: existing.id,
            },
            data: {
              answer: answerData.answer || null,
              status: answerData.status === 'generated' ? 'generated' : 'manual',
              sources: answerData.sources ? (answerData.sources as any) : null,
              generatedAt: answerData.status === 'generated' ? new Date() : null,
              updatedBy: answerData.status === 'manual' ? userId || null : null,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new (shouldn't happen, but handle it)
          return db.questionnaireQuestionAnswer.create({
            data: {
              questionnaireId,
              question: '', // Will be updated from parse results
              questionIndex: answerData.questionIndex,
              answer: answerData.answer || null,
              status: answerData.status === 'generated' ? 'generated' : 'manual',
              sources: answerData.sources ? (answerData.sources as any) : null,
              generatedAt: answerData.status === 'generated' ? new Date() : null,
              updatedBy: answerData.status === 'manual' ? userId || null : null,
            },
          });
        }
      });

      await Promise.all(updatePromises);

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
      console.error('Error saving answers batch:', error);
      return {
        success: false,
        error: 'Failed to save answers',
      };
    }
  });


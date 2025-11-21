'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { syncManualAnswerToVector } from '@/lib/vector/sync/sync-manual-answer';
import { logger } from '@/utils/logger';

const saveAnswerSchema = z.object({
  questionnaireId: z.string(),
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
});

export const saveAnswerAction = authActionClient
  .inputSchema(saveAnswerSchema)
  .metadata({
    name: 'save-questionnaire-answer',
    track: {
      event: 'save-questionnaire-answer',
      description: 'Save Questionnaire Answer',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { questionnaireId, questionIndex, answer, sources, status } = parsedInput;
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
        include: {
          questions: {
            where: {
              questionIndex,
            },
          },
        },
      });

      if (!questionnaire) {
        return {
          success: false,
          error: 'Questionnaire not found',
        };
      }

      const existingQuestion = questionnaire.questions[0];

      if (existingQuestion) {
        // Update existing question answer
        await db.questionnaireQuestionAnswer.update({
          where: {
            id: existingQuestion.id,
          },
          data: {
            answer: answer || null,
            status: status === 'generated' ? 'generated' : 'manual',
            sources: sources ? (sources as any) : null,
            generatedAt: status === 'generated' ? new Date() : null,
            updatedBy: status === 'manual' ? userId || null : null,
            updatedAt: new Date(),
          },
        });

        // If status is manual and answer exists, also save to SecurityQuestionnaireManualAnswer
        if (status === 'manual' && answer && answer.trim().length > 0 && existingQuestion.question) {
          try {
            const manualAnswer = await db.securityQuestionnaireManualAnswer.upsert({
              where: {
                organizationId_question: {
                  organizationId: activeOrganizationId,
                  question: existingQuestion.question.trim(),
                },
              },
              create: {
                question: existingQuestion.question.trim(),
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

            // Sync to vector DB SYNCHRONOUSLY
            logger.info('🔄 Syncing manual answer to vector DB from save-answer', {
              manualAnswerId: manualAnswer.id,
              organizationId: activeOrganizationId,
              questionIndex,
            });

            const syncResult = await syncManualAnswerToVector(
              manualAnswer.id,
              activeOrganizationId,
            );

            if (!syncResult.success) {
              logger.error('❌ Failed to sync manual answer to vector DB', {
                manualAnswerId: manualAnswer.id,
                organizationId: activeOrganizationId,
                error: syncResult.error,
              });
              // Don't fail the main operation - manual answer is saved in DB
            } else {
              logger.info('✅ Successfully synced manual answer to vector DB', {
                manualAnswerId: manualAnswer.id,
                embeddingId: syncResult.embeddingId,
                organizationId: activeOrganizationId,
              });
            }
          } catch (error) {
            // Log error but don't fail the main operation
            logger.error('Error saving to manual answers:', {
              error: error instanceof Error ? error.message : 'Unknown error',
              questionIndex,
              organizationId: activeOrganizationId,
            });
          }
        }
      } else {
        // Create new question answer (shouldn't happen, but handle it)
        await db.questionnaireQuestionAnswer.create({
          data: {
            questionnaireId,
            question: '', // Will be updated from parse results
            questionIndex,
            answer: answer || null,
            status: status === 'generated' ? 'generated' : 'manual',
            sources: sources ? (sources as any) : null,
            generatedAt: status === 'generated' ? new Date() : null,
            updatedBy: status === 'manual' ? userId || null : null,
          },
        });
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
      console.error('Error saving answer:', error);
      return {
        success: false,
        error: 'Failed to save answer',
      };
    }
  });


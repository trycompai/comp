'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { syncManualAnswerToVector } from '@/lib/vector/sync/sync-manual-answer';
import { logger } from '@/utils/logger';

const updateAnswerSchema = z.object({
  questionnaireId: z.string(),
  questionAnswerId: z.string(),
  answer: z.string(),
  status: z.enum(['generated', 'manual']).optional().default('manual'),
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
    const { questionnaireId, questionAnswerId, answer, status, sources } = parsedInput;
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

      // Store the previous status to determine if this was written from scratch
      const previousStatus = questionAnswer.status;

      // Update the answer
      await db.questionnaireQuestionAnswer.update({
        where: {
          id: questionAnswerId,
        },
        data: {
          answer: answer.trim() || null,
          status: status === 'generated' ? 'generated' : 'manual',
          sources: sources ? (sources as any) : null,
          generatedAt: status === 'generated' ? new Date() : null,
          updatedBy: status === 'manual' ? userId || null : null,
          updatedAt: new Date(),
        },
      });

      const shouldPersistManualAnswer =
        status === 'manual' && answer && answer.trim().length > 0 && questionAnswer.question;

      if (shouldPersistManualAnswer) {
        try {
          const manualAnswer = await db.securityQuestionnaireManualAnswer.upsert({
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

          // Sync to vector DB SYNCHRONOUSLY
          logger.info('🔄 Syncing manual answer to vector DB from questionnaire update', {
            manualAnswerId: manualAnswer.id,
            organizationId: activeOrganizationId,
            questionId: questionAnswerId,
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
            questionAnswerId,
            organizationId: activeOrganizationId,
          });
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


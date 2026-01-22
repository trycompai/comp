'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { syncManualAnswerToVector } from '@/lib/vector/sync/sync-manual-answer';
import { countEmbeddings, listManualAnswerEmbeddings } from '@/lib/vector';
import { logger } from '@/utils/logger';

const saveManualAnswerSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  questionnaireId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export const saveManualAnswer = authActionClient
  .inputSchema(saveManualAnswerSchema)
  .metadata({
    name: 'save-manual-answer',
    track: {
      event: 'save-manual-answer',
      description: 'Save Manual Answer',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { question, answer, questionnaireId, tags } = parsedInput;
    const { activeOrganizationId } = ctx.session;
    const userId = ctx.user.id;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      // Upsert manual answer (create or update if question already exists)
      const manualAnswer = await db.securityQuestionnaireManualAnswer.upsert({
        where: {
          organizationId_question: {
            organizationId: activeOrganizationId,
            question: question.trim(),
          },
        },
        create: {
          question: question.trim(),
          answer: answer.trim(),
          tags: tags || [],
          organizationId: activeOrganizationId,
          sourceQuestionnaireId: questionnaireId || null,
          createdBy: userId || null,
          updatedBy: userId || null,
        },
        update: {
          answer: answer.trim(),
          tags: tags || [],
          sourceQuestionnaireId: questionnaireId || null,
          updatedBy: userId || null,
          updatedAt: new Date(),
        },
      });

      // Sync to vector DB SYNCHRONOUSLY (fast ~1-2 sec)
      // This ensures manual answers are immediately available for answer generation
      
      // Count embeddings BEFORE sync
      const countBefore = await countEmbeddings(activeOrganizationId, 'manual_answer');
      logger.info('📊 Manual answer embeddings count BEFORE sync', {
        organizationId: activeOrganizationId,
        count: countBefore.total,
        bySourceType: countBefore.bySourceType,
      });

      const syncResult = await syncManualAnswerToVector(
        manualAnswer.id,
        activeOrganizationId,
      );

      if (!syncResult.success) {
        // Log error but don't fail the operation
        logger.error('❌ Failed to sync manual answer to vector DB', {
          manualAnswerId: manualAnswer.id,
          organizationId: activeOrganizationId,
          error: syncResult.error,
        });
        // Still return success - manual answer is saved in DB
      } else {
        // Count embeddings AFTER sync to verify it was added
        const countAfter = await countEmbeddings(activeOrganizationId, 'manual_answer');
        logger.info('📊 Manual answer embeddings count AFTER sync', {
          organizationId: activeOrganizationId,
          count: countAfter.total,
          bySourceType: countAfter.bySourceType,
          increased: countAfter.total > countBefore.total,
          difference: countAfter.total - countBefore.total,
        });

        // Also list all manual answer embeddings for debugging
        const allManualAnswers = await listManualAnswerEmbeddings(activeOrganizationId);
        logger.info('📋 All manual answer embeddings in vector DB', {
          organizationId: activeOrganizationId,
          count: allManualAnswers.length,
          embeddings: allManualAnswers.map((e) => ({
            id: e.id,
            sourceId: e.sourceId,
            contentPreview: e.content.substring(0, 100),
          })),
        });
      }

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      // Also revalidate knowledge base page
      revalidatePath(`/${activeOrganizationId}/questionnaire/knowledge-base`);

      // Return embedding ID for verification
      // Use embeddingId from syncResult if available, otherwise construct it
      const embeddingId = syncResult.embeddingId || `manual_answer_${manualAnswer.id}`;

      return {
        success: true,
        syncedToVector: syncResult.success,
        manualAnswerId: manualAnswer.id,
        embeddingId, // Embedding ID for verification in Upstash Vector (e.g., "manual_answer_sqma_xxx")
      };
    } catch (error) {
      console.error('Error saving manual answer:', error);
      return {
        success: false,
        error: 'Failed to save manual answer',
      };
    }
  });


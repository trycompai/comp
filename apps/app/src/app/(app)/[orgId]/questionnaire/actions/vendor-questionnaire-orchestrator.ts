'use server';

import { authActionClient } from '@/actions/safe-action';
import { answerQuestion } from '@/jobs/tasks/vendors/answer-question';
import { syncOrganizationEmbeddings } from '@/lib/vector';
import { logger } from '@/utils/logger';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const inputSchema = z.object({
  questionsAndAnswers: z.array(
    z.object({
      question: z.string(),
      answer: z.string().nullable(),
      _originalIndex: z.number().optional(), // Preserves original index from QuestionnaireResult
    }),
  ),
});

export const vendorQuestionnaireOrchestrator = authActionClient
  .inputSchema(inputSchema)
  .metadata({
    name: 'vendor-questionnaire-orchestrator',
    track: {
      event: 'vendor-questionnaire-orchestrator',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { questionsAndAnswers } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    const organizationId = session.activeOrganizationId;

    try {
      logger.info('Starting auto-answer questionnaire', {
        organizationId,
        questionCount: questionsAndAnswers.length,
      });

      // Sync organization embeddings before generating answers
      // Uses incremental sync: only updates what changed (much faster than full sync)
      try {
        await syncOrganizationEmbeddings(organizationId);
        logger.info('Organization embeddings synced successfully', {
          organizationId,
        });
      } catch (error) {
        logger.warn('Failed to sync organization embeddings', {
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with existing embeddings if sync fails
      }

      // Filter questions that need answers (skip already answered)
      // Preserve original index if provided (for single question answers)
      const questionsToAnswer = questionsAndAnswers
        .map((qa, index) => ({
          ...qa,
          index: qa._originalIndex !== undefined ? qa._originalIndex : index,
        }))
        .filter((qa) => !qa.answer || qa.answer.trim().length === 0);

      logger.info('Questions to answer', {
        total: questionsAndAnswers.length,
        toAnswer: questionsToAnswer.length,
      });

      // Process all questions in parallel by calling answerQuestion directly
      // Note: metadata updates are disabled since we're not in a Trigger.dev task context
      const results = await Promise.all(
        questionsToAnswer.map((qa) =>
          answerQuestion(
            {
              question: qa.question,
              organizationId,
              questionIndex: qa.index,
              totalQuestions: questionsAndAnswers.length,
            },
            { useMetadata: false },
          ),
        ),
      );

      // Process results
      const allAnswers: Array<{
        questionIndex: number;
        question: string;
        answer: string | null;
        sources?: Array<{
          sourceType: string;
          sourceName?: string;
          score: number;
        }>;
      }> = results.map((result) => ({
        questionIndex: result.questionIndex,
        question: result.question,
        answer: result.answer,
        sources: result.sources,
      }));

      logger.info('Auto-answer questionnaire completed', {
        organizationId,
        totalQuestions: questionsAndAnswers.length,
        answered: allAnswers.filter((a) => a.answer).length,
      });

      // Revalidate the page to show updated answers
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: true,
        data: {
          answers: allAnswers,
        },
      };
    } catch (error) {
      logger.error('Failed to answer questions', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? error
        : new Error('Failed to answer questions');
    }
  });


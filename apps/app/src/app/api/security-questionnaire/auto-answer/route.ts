import { auth } from '@/utils/auth';
import { answerQuestion } from '@/jobs/tasks/vendors/answer-question';
import { syncOrganizationEmbeddings } from '@/lib/vector';
import { logger } from '@/utils/logger';
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse?.session?.activeOrganizationId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const organizationId = sessionResponse.session.activeOrganizationId;

  // Set up SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await req.json();
        const { questionsAndAnswers } = body;

        logger.info('Starting auto-answer questionnaire via SSE', {
          organizationId,
          questionCount: questionsAndAnswers.length,
        });

        // Sync organization embeddings before generating answers
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
        }

        // Filter questions that need answers
        // Preserve original index if provided (for QuestionnaireResult with originalIndex)
        const questionsToAnswer = questionsAndAnswers
          .map((qa: { question: string; answer: string | null; _originalIndex?: number }, index: number) => ({
            ...qa,
            index: qa._originalIndex !== undefined ? qa._originalIndex : index,
          }))
          .filter((qa) => !qa.answer || qa.answer.trim().length === 0);

        // Send initial progress
        send({
          type: 'progress',
          total: questionsToAnswer.length,
          completed: 0,
          remaining: questionsToAnswer.length,
        });

        // Process questions in parallel but send updates as they complete
        const results: Array<{
          questionIndex: number;
          question: string;
          answer: string | null;
          sources?: Array<{
            sourceType: string;
            sourceName?: string;
            score: number;
          }>;
        }> = [];

        // Use Promise.allSettled to handle all questions and send updates incrementally
        const promises = questionsToAnswer.map(async (qa: any) => {
          try {
            const result = await answerQuestion(
              {
                question: qa.question,
                organizationId,
                questionIndex: qa.index,
                totalQuestions: questionsAndAnswers.length,
              },
              { useMetadata: false },
            );

            // Send update for this completed question
            send({
              type: 'answer',
              questionIndex: result.questionIndex,
              question: result.question,
              answer: result.answer,
              sources: result.sources,
              success: result.success,
            });

            return result;
          } catch (error) {
            logger.error('Failed to answer question', {
              questionIndex: qa.index,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            // Send error update
            send({
              type: 'answer',
              questionIndex: qa.index,
              question: qa.question,
              answer: null,
              sources: [],
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
              success: false,
              questionIndex: qa.index,
              question: qa.question,
              answer: null,
              sources: [],
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        // Wait for all questions to complete
        const settledResults = await Promise.allSettled(promises);

        // Collect all results
        settledResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push({
              questionIndex: result.value.questionIndex,
              question: result.value.question,
              answer: result.value.answer,
              sources: result.value.sources,
            });
          }
        });

        // Send completion
        send({
          type: 'complete',
          total: questionsToAnswer.length,
          answered: results.filter((r) => r.answer).length,
          answers: results,
        });

        logger.info('Auto-answer questionnaire completed via SSE', {
          organizationId,
          totalQuestions: questionsAndAnswers.length,
          answered: results.filter((r) => r.answer).length,
        });

        controller.close();
      } catch (error) {
        logger.error('Error in auto-answer SSE stream', {
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}


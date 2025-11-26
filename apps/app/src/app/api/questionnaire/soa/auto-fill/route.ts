import { auth } from '@/utils/auth';
import { syncOrganizationEmbeddings } from '@/lib/vector';
import { logger } from '@/utils/logger';
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@db';
import { checkIfFullyRemote } from './helpers/check-fully-remote';
import { processQuestion } from './helpers/process-question';
import {
  saveAnswersToDatabase,
  updateConfigurationWithResults,
  updateDocumentAfterAutoFill,
} from './helpers/save-answers';

export async function POST(req: NextRequest) {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse?.session?.activeOrganizationId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const organizationId = sessionResponse.session.activeOrganizationId;
  const userId = sessionResponse.user?.id;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Set up SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await req.json();
        const { documentId } = body;

        logger.info('Starting auto-fill SOA via SSE', {
          organizationId,
          documentId,
        });

        // Fetch SOA document with configuration
        const document = await db.sOADocument.findFirst({
          where: {
            id: documentId,
            organizationId,
          },
          include: {
            framework: true,
            configuration: true,
            answers: {
              where: {
                isLatestAnswer: true,
              },
            },
          },
        });

        if (!document) {
          send({
            type: 'error',
            error: 'SOA document not found',
          });
          controller.close();
          return;
        }

        const configuration = document.configuration;
        const questions = configuration.questions as Array<{
          id: string;
          text: string;
          columnMapping: {
            closure: string;
            title: string;
            control_objective: string | null;
            isApplicable: boolean | null;
            justification: string | null;
          };
        }>;

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

        // Send initial progress
        send({
          type: 'progress',
          total: questions.length,
          completed: 0,
          remaining: questions.length,
        });

        // Check if organization is fully remote
        const isFullyRemote = await checkIfFullyRemote(organizationId);

        // Send 'processing' status for all questions immediately for instant UI feedback
        questions.forEach((question, index) => {
          send({
            type: 'processing',
            questionId: question.id,
            questionIndex: index,
          });
        });

        // Process questions in parallel
        const results: Array<{
          questionId: string;
          isApplicable: boolean | null;
          justification: string | null;
          success: boolean;
          error?: string;
          insufficientData?: boolean;
        }> = [];

        // Process all questions in parallel
        const promises = questions.map(async (question, index) => {
          try {
            return await processQuestion(question, index, organizationId, isFullyRemote, send);
          } catch (error) {
            logger.error('Failed to process SOA question', {
              questionId: question.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            send({
              type: 'answer',
              questionId: question.id,
              questionIndex: index,
              isApplicable: null,
              justification: null,
              success: false,
              error: 'Insufficient data',
              insufficientData: true,
            });

            return {
              questionId: question.id,
              isApplicable: null,
              justification: null,
              success: false,
              error: 'Insufficient data',
              insufficientData: true,
            };
          }
        });

        // Wait for all questions to complete
        const settledResults = await Promise.allSettled(promises);

        // Collect all results
        settledResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          }
        });

        // Save answers to database
        const successfulResults = results.filter((r) => r.success && r.isApplicable !== null);
        
        await saveAnswersToDatabase(documentId, questions, successfulResults, userId);
        
        // Update configuration with results
        await updateConfigurationWithResults(
          configuration.id,
          questions,
          successfulResults,
        );
        
        // Update document
        const answeredCount = successfulResults.filter((r) => r.isApplicable !== null).length;
        await updateDocumentAfterAutoFill(documentId, questions.length, answeredCount);

        // Send completion
        send({
          type: 'complete',
          total: questions.length,
          answered: successfulResults.length,
          results: successfulResults,
        });

        logger.info('Auto-fill SOA completed via SSE', {
          organizationId,
          documentId,
          totalQuestions: questions.length,
          answered: successfulResults.length,
        });

        controller.close();
      } catch (error) {
        logger.error('Error in auto-fill SOA SSE stream', {
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


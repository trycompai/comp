import { syncOrganizationEmbeddings } from '@/lib/vector';
import { logger, metadata, task } from '@trigger.dev/sdk';
import { answerQuestion } from './answer-question';

// Process all questions in parallel by calling answerQuestion directly as a function
// This allows metadata updates to happen incrementally as questions complete

export const vendorQuestionnaireOrchestratorTask = task({
  id: 'vendor-questionnaire-orchestrator',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: {
    vendorId: string;
    organizationId: string;
    questionsAndAnswers: Array<{
      question: string;
      answer: string | null;
    }>;
  }) => {
    logger.info('Starting auto-answer questionnaire task', {
      vendorId: payload.vendorId,
      organizationId: payload.organizationId,
      questionCount: payload.questionsAndAnswers.length,
    });

    // Sync organization embeddings before generating answers
    // Uses incremental sync: only updates what changed (much faster than full sync)
    try {
      await syncOrganizationEmbeddings(payload.organizationId);
      logger.info('Organization embeddings synced successfully', {
        organizationId: payload.organizationId,
      });
    } catch (error) {
      logger.warn('Failed to sync organization embeddings', {
        organizationId: payload.organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue with existing embeddings if sync fails
    }

    // Filter questions that need answers (skip already answered)
    // Preserve original index if provided (for single question answers)
    const questionsToAnswer = payload.questionsAndAnswers
      .map((qa, index) => ({
        ...qa,
        index: (qa as any)._originalIndex !== undefined ? (qa as any)._originalIndex : index,
      }))
      .filter((qa) => !qa.answer || qa.answer.trim().length === 0);

    logger.info('Questions to answer', {
      total: payload.questionsAndAnswers.length,
      toAnswer: questionsToAnswer.length,
    });

    // Initialize metadata for tracking progress
    metadata.set('questionsTotal', questionsToAnswer.length);
    metadata.set('questionsCompleted', 0);
    metadata.set('questionsRemaining', questionsToAnswer.length);

    // Initialize individual question statuses - all start as 'pending'
    // Each question will update its own status to 'processing' when it starts
    // and 'completed' when it finishes
    questionsToAnswer.forEach((qa) => {
      metadata.set(`question_${qa.index}_status`, 'pending');
    });

    // Process all questions in parallel by calling answerQuestion directly
    // This allows metadata updates to happen incrementally as questions complete
    const results = await Promise.all(
      questionsToAnswer.map((qa) =>
        answerQuestion({
          question: qa.question,
          organizationId: payload.organizationId,
          questionIndex: qa.index,
          totalQuestions: payload.questionsAndAnswers.length,
        }),
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
      vendorId: payload.vendorId,
      totalQuestions: payload.questionsAndAnswers.length,
      answered: allAnswers.filter((a) => a.answer).length,
    });

    // Mark as completed
    metadata.set('completed', true);

    return {
      success: true,
      answers: allAnswers,
    };
  },
});

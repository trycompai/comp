import { syncOrganizationEmbeddings } from '@/vector-store/lib';
import { logger, metadata, task } from '@trigger.dev/sdk';
import { generateAnswerWithRAG } from './answer-question-helpers';

export interface AnswerQuestionPayload {
  question: string;
  organizationId: string;
  questionIndex: number;
  totalQuestions: number;
}

export interface AnswerQuestionResult {
  success: boolean;
  questionIndex: number;
  question: string;
  answer: string | null;
  sources: Array<{
    sourceType: string;
    sourceName?: string;
    score: number;
  }>;
  error?: string;
}

export interface AnswerQuestionOptions {
  /**
   * Whether to push updates to Trigger.dev metadata.
   * Disable when running outside of a Trigger task (e.g. server actions).
   */
  useMetadata?: boolean;
  /**
   * Whether to skip syncing organization embeddings.
   * Set to true when sync has already been performed (e.g., in batch operations).
   */
  skipSync?: boolean;
}

/**
 * Core function to answer a question - can be called directly or wrapped in a task
 */
export async function answerQuestion(
  payload: AnswerQuestionPayload,
  options: AnswerQuestionOptions = {},
): Promise<AnswerQuestionResult> {
  const { useMetadata = true, skipSync = false } = options;

  const withMetadata = (fn: () => void) => {
    if (!useMetadata) {
      return;
    }

    try {
      fn();
    } catch (error) {
      logger.warn('Metadata operation failed – continuing without metadata', {
        questionIndex: payload.questionIndex,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  logger.info('🚀 Starting to process question', {
    questionIndex: payload.questionIndex,
    totalQuestions: payload.totalQuestions,
    question: payload.question.substring(0, 100),
    organizationId: payload.organizationId,
  });

  // Update metadata to mark this question as processing
  // This allows frontend to show spinner for this specific question when it starts
  withMetadata(() => {
    metadata.set(`question_${payload.questionIndex}_status`, 'processing');
  });

  const buildMetadataAnswerPayload = (answerValue: string | null) => ({
    questionIndex: payload.questionIndex,
    question: payload.question,
    answer: answerValue,
    // Sources are NOT included in metadata to avoid blocking incremental updates
    // Sources will be available in the final output and updated separately
    sources: [],
  });

  try {
    // Sync organization embeddings before generating answer
    // Uses incremental sync: only updates what changed (much faster than full sync)
    // Lock mechanism prevents concurrent syncs for the same organization
    // Skip sync if already performed (e.g., in batch operations)
    if (!skipSync) {
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
    } else {
      logger.info('Skipping sync (already performed)', {
        organizationId: payload.organizationId,
      });
    }

    logger.info('🔍 Calling generateAnswerWithRAG', {
      questionIndex: payload.questionIndex,
    });

    const result = await generateAnswerWithRAG(
      payload.question,
      payload.organizationId,
    );

    // Update metadata with this answer immediately
    // This allows frontend to show answers as they complete individually
    // Sources are NOT included in metadata to avoid blocking incremental updates
    // Sources will be available in the final output
    const metadataAnswer = buildMetadataAnswerPayload(result.answer);

    withMetadata(() => {
      metadata.set(`answer_${payload.questionIndex}`, metadataAnswer);
      metadata.set(`question_${payload.questionIndex}_status`, 'completed');
      metadata.increment('questionsCompleted', 1);
      metadata.increment('questionsRemaining', -1);
    });

    return {
      success: true,
      questionIndex: payload.questionIndex,
      question: payload.question,
      answer: result.answer,
      sources: result.sources,
    };
  } catch (error) {
    logger.error('❌ Failed to answer question', {
      questionIndex: payload.questionIndex,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    const failedAnswerData = buildMetadataAnswerPayload(null);

    // Update metadata even on failure
    withMetadata(() => {
      metadata.set(`answer_${payload.questionIndex}`, failedAnswerData);
      metadata.set(`question_${payload.questionIndex}_status`, 'completed');
      metadata.increment('questionsCompleted', 1);
      metadata.increment('questionsRemaining', -1);
    });

    return {
      success: false,
      questionIndex: payload.questionIndex,
      question: payload.question,
      answer: null,
      sources: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger.dev task wrapper for frontend use (single question answers)
 * This wraps the answerQuestion function so it can be triggered from the frontend
 */
export const answerQuestionTask = task({
  id: 'answer-question',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: {
    question: string;
    organizationId: string;
    questionIndex: number;
    totalQuestions: number;
  }) => {
    return await answerQuestion(payload);
  },
});

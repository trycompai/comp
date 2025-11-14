import { logger, task } from '@trigger.dev/sdk';
import { generateAnswerWithRAG } from './answer-question-helpers';

export const answerQuestion = task({
  id: 'answer-question',
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: {
    question: string;
    organizationId: string;
    questionIndex: number;
    totalQuestions: number;
  }) => {
    logger.info('🚀 Starting to process question', {
      questionIndex: payload.questionIndex,
      totalQuestions: payload.totalQuestions,
      question: payload.question.substring(0, 100),
      organizationId: payload.organizationId,
    });

    try {
      logger.info('🔍 Calling generateAnswerWithRAG', {
        questionIndex: payload.questionIndex,
      });

      const result = await generateAnswerWithRAG(
        payload.question,
        payload.organizationId,
      );

      logger.info('✅ Successfully generated answer', {
        questionIndex: payload.questionIndex,
        hasAnswer: !!result.answer,
        sourcesCount: result.sources.length,
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

      return {
        success: false,
        questionIndex: payload.questionIndex,
        question: payload.question,
        answer: null,
        sources: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});


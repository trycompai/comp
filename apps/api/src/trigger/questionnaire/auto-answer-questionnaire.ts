import { db } from '@db';
import { logger, metadata, tags, task } from '@trigger.dev/sdk';
import { syncOrganizationEmbeddings } from '@/vector-store/lib';
import { saveGeneratedAnswer } from '@/questionnaire/utils/questionnaire-storage';
import { generateAnswerWithRAGBatch } from './answer-question-helpers';

/**
 * Generates answers for every unanswered question in an already-parsed
 * questionnaire and persists them to the DB.
 *
 * WHY THIS EXISTS
 * ---------------
 * The interactive UI answers questionnaires via the SSE endpoint
 * (POST /v1/questionnaire/auto-answer), which streams progress event-by-event.
 * A streaming response can't be consumed by a single JSON-RPC call, so it is
 * unusable from the MCP server / AI agents. This task is the non-streaming
 * equivalent: an agent calls POST /v1/questionnaire/:id/auto-answer (which
 * triggers this task and returns immediately), then polls
 * GET /v1/questionnaire/:id and watches `answeredQuestions` climb to
 * `totalQuestions`. `saveGeneratedAnswer` updates that count after each answer,
 * so progress is visible to pollers in near real-time.
 *
 * It reuses the exact same generation (generateAnswerWithRAGBatch) and
 * persistence (saveGeneratedAnswer) the SSE path uses — only the transport
 * differs — so answers are identical regardless of which path produced them.
 */
export const autoAnswerQuestionnaireTask = task({
  id: 'auto-answer-questionnaire',
  retry: { maxAttempts: 2 },
  maxDuration: 60 * 20, // 20 minutes (seconds) for large questionnaires
  run: async (payload: {
    questionnaireId: string;
    organizationId: string;
  }) => {
    const { questionnaireId, organizationId } = payload;

    await tags.add([`org:${organizationId}`]);
    logger.info('Starting auto-answer questionnaire task', {
      questionnaireId,
      organizationId,
    });

    const questionnaire = await db.questionnaire.findFirst({
      where: { id: questionnaireId, organizationId },
      include: { questions: { orderBy: { questionIndex: 'asc' } } },
    });

    if (!questionnaire) {
      throw new Error(
        `Questionnaire ${questionnaireId} not found for organization ${organizationId}`,
      );
    }

    // Only (re)generate answers for questions that don't already have one, so a
    // re-run is idempotent and won't overwrite manual edits.
    const toAnswer = questionnaire.questions.filter(
      (q) => !q.answer || q.answer.trim().length === 0,
    );

    if (toAnswer.length === 0) {
      logger.info('No unanswered questions; nothing to do', { questionnaireId });
      metadata.set('status', 'completed').set('progress', 100);
      return {
        questionnaireId,
        answered: 0,
        requested: 0,
        totalQuestions: questionnaire.totalQuestions,
      };
    }

    // Embeddings power the RAG retrieval; sync once before the batch. A failure
    // here is non-fatal (we still attempt generation with whatever exists).
    metadata.set('status', 'syncing_embeddings').set('progress', 10);
    try {
      await syncOrganizationEmbeddings(organizationId);
    } catch (error) {
      logger.warn('Failed to sync organization embeddings', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    metadata.set('status', 'generating_answers').set('progress', 40);
    // Results are returned in the same order as the input questions.
    const results = await generateAnswerWithRAGBatch(
      toAnswer.map((q) => q.question),
      organizationId,
    );

    metadata.set('status', 'saving_answers').set('progress', 80);
    let answered = 0;
    for (let i = 0; i < toAnswer.length; i++) {
      const result = results[i];
      if (!result || !result.answer) {
        continue;
      }
      await saveGeneratedAnswer({
        questionnaireId,
        questionIndex: toAnswer[i].questionIndex,
        answer: result.answer,
        sources: result.sources,
      });
      answered++;
    }

    logger.info('Auto-answer questionnaire task completed', {
      questionnaireId,
      answered,
      requested: toAnswer.length,
    });
    metadata.set('status', 'completed').set('progress', 100);

    return {
      questionnaireId,
      answered,
      requested: toAnswer.length,
      totalQuestions: questionnaire.totalQuestions,
    };
  },
});

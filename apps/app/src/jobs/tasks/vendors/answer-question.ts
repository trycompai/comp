import { syncOrganizationEmbeddings } from "@/lib/vector";
import { logger, metadata, task } from "@trigger.dev/sdk";

import { generateAnswerWithRAG } from "./answer-question-helpers";

export const answerQuestion = task({
  id: "answer-question",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: {
    question: string;
    organizationId: string;
    questionIndex: number;
    totalQuestions: number;
  }) => {
    logger.info("🚀 Starting to process question", {
      questionIndex: payload.questionIndex,
      totalQuestions: payload.totalQuestions,
      question: payload.question.substring(0, 100),
      organizationId: payload.organizationId,
    });

    // Update metadata to mark this question as processing
    // This allows frontend to show spinner for this specific question when it starts
    // Note: When called directly (not as child), metadata.parent is null, so use metadata directly
    if (metadata.parent) {
      metadata.parent.set(
        `question_${payload.questionIndex}_status`,
        "processing",
      );
    } else {
      metadata.set(`question_${payload.questionIndex}_status`, "processing");
    }

    try {
      // Sync organization embeddings before generating answer
      // Uses incremental sync: only updates what changed (much faster than full sync)
      // Lock mechanism prevents concurrent syncs for the same organization
      try {
        await syncOrganizationEmbeddings(payload.organizationId);
        logger.info("Organization embeddings synced successfully", {
          organizationId: payload.organizationId,
        });
      } catch (error) {
        logger.warn("Failed to sync organization embeddings", {
          organizationId: payload.organizationId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Continue with existing embeddings if sync fails
      }

      logger.info("🔍 Calling generateAnswerWithRAG", {
        questionIndex: payload.questionIndex,
      });

      const result = await generateAnswerWithRAG(
        payload.question,
        payload.organizationId,
      );

      logger.info("✅ Successfully generated answer", {
        questionIndex: payload.questionIndex,
        hasAnswer: !!result.answer,
        sourcesCount: result.sources.length,
      });

      const answerData = {
        questionIndex: payload.questionIndex,
        question: payload.question,
        answer: result.answer,
        sources: result.sources,
      };

      // Update metadata with this answer immediately
      // This allows frontend to show answers as they complete individually
      // When called directly (not as child), use metadata directly instead of metadata.parent
      if (metadata.parent) {
        metadata.parent.set(`answer_${payload.questionIndex}`, answerData);
        metadata.parent.set(
          `question_${payload.questionIndex}_status`,
          "completed",
        );
        metadata.parent.increment("questionsCompleted", 1);
        metadata.parent.increment("questionsRemaining", -1);
      } else {
        // Direct call: update metadata directly for frontend to read
        metadata.set(`answer_${payload.questionIndex}`, answerData);
        metadata.set(`question_${payload.questionIndex}_status`, "completed");
      }

      return {
        success: true,
        questionIndex: payload.questionIndex,
        question: payload.question,
        answer: result.answer,
        sources: result.sources,
      };
    } catch (error) {
      logger.error("❌ Failed to answer question", {
        questionIndex: payload.questionIndex,
        error: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      const failedAnswerData = {
        questionIndex: payload.questionIndex,
        question: payload.question,
        answer: null,
        sources: [],
      };

      // Update metadata even on failure
      // When called directly (not as child), use metadata directly instead of metadata.parent
      if (metadata.parent) {
        metadata.parent.set(
          `answer_${payload.questionIndex}`,
          failedAnswerData,
        );
        metadata.parent.set(
          `question_${payload.questionIndex}_status`,
          "completed",
        );
        metadata.parent.increment("questionsCompleted", 1);
        metadata.parent.increment("questionsRemaining", -1);
      } else {
        // Direct call: update metadata directly for frontend to read
        metadata.set(`answer_${payload.questionIndex}`, failedAnswerData);
        metadata.set(`question_${payload.questionIndex}_status`, "completed");
      }

      return {
        success: false,
        questionIndex: payload.questionIndex,
        question: payload.question,
        answer: null,
        sources: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

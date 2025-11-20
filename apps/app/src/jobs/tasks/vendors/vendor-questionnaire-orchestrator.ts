import { syncOrganizationEmbeddings } from "@/lib/vector";
import { logger, metadata, task } from "@trigger.dev/sdk";

import { answerQuestion } from "./answer-question";

const BATCH_SIZE = 500; // Process 500 (prev. used) 10 questions at a time

export const vendorQuestionnaireOrchestratorTask = task({
  id: "vendor-questionnaire-orchestrator",
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
    logger.info("Starting auto-answer questionnaire task", {
      vendorId: payload.vendorId,
      organizationId: payload.organizationId,
      questionCount: payload.questionsAndAnswers.length,
    });

    // Sync organization embeddings before generating answers
    // Uses incremental sync: only updates what changed (much faster than full sync)
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

    // Filter questions that need answers (skip already answered)
    // Preserve original index if provided (for single question answers)
    const questionsToAnswer = payload.questionsAndAnswers
      .map((qa, index) => ({
        ...qa,
        index:
          (qa as any)._originalIndex !== undefined
            ? (qa as any)._originalIndex
            : index,
      }))
      .filter((qa) => !qa.answer || qa.answer.trim().length === 0);

    logger.info("Questions to answer", {
      total: payload.questionsAndAnswers.length,
      toAnswer: questionsToAnswer.length,
    });

    // Initialize metadata for tracking progress
    metadata.set("questionsTotal", questionsToAnswer.length);
    metadata.set("questionsCompleted", 0);
    metadata.set("questionsRemaining", questionsToAnswer.length);
    metadata.set("currentBatch", 0);
    metadata.set(
      "totalBatches",
      Math.ceil(questionsToAnswer.length / BATCH_SIZE),
    );

    // Initialize individual question statuses - all start as 'pending'
    // Each question will update its own status to 'processing' when it starts
    // and 'completed' when it finishes
    questionsToAnswer.forEach((qa) => {
      metadata.set(`question_${qa.index}_status`, "pending");
    });

    // Process questions in batches of 10
    const allAnswers: Array<{
      questionIndex: number;
      question: string;
      answer: string | null;
      sources?: Array<{
        sourceType: string;
        sourceName?: string;
        score: number;
      }>;
    }> = [];

    for (let i = 0; i < questionsToAnswer.length; i += BATCH_SIZE) {
      const batch = questionsToAnswer.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(questionsToAnswer.length / BATCH_SIZE);

      logger.info(`Processing batch ${batchNumber}/${totalBatches}`, {
        batchSize: batch.length,
        questionIndices: batch.map((q) => q.index),
      });

      // Update metadata
      metadata.set("currentBatch", batchNumber);

      // Use batchTriggerAndWait - this runs tasks in parallel and waits for all to complete
      const batchItems = batch.map((qa) => ({
        payload: {
          question: qa.question,
          organizationId: payload.organizationId,
          questionIndex: qa.index,
          totalQuestions: payload.questionsAndAnswers.length,
        },
      }));

      const batchHandle = await answerQuestion.batchTriggerAndWait(batchItems);

      // Process batch results - batchHandle has a .runs property with the results array
      batchHandle.runs.forEach((run, batchIdx) => {
        const qa = batch[batchIdx];

        if (run.ok && run.output) {
          const taskResult = run.output;
          if (taskResult.success && taskResult.answer) {
            allAnswers.push({
              questionIndex: qa.index,
              question: qa.question,
              answer: taskResult.answer,
              sources: taskResult.sources,
            });
          } else {
            allAnswers.push({
              questionIndex: qa.index,
              question: qa.question,
              answer: null,
              sources: [],
            });
          }
        } else {
          // Task failed - error is only available when run.ok is false
          const errorMessage =
            run.ok === false && run.error
              ? run.error instanceof Error
                ? run.error.message
                : String(run.error)
              : "Unknown error";

          logger.error("Task failed", {
            questionIndex: qa.index,
            error: errorMessage,
          });
          allAnswers.push({
            questionIndex: qa.index,
            question: qa.question,
            answer: null,
            sources: [],
          });
        }
      });

      // Note: Individual answers and progress counters are updated in metadata
      // by each answer-question task via metadata.parent.set() and metadata.parent.increment()
      // This allows frontend to show answers as they complete individually
      // No need to update counters here - they're already updated by individual tasks

      logger.info(`Batch ${batchNumber}/${totalBatches} completed`, {
        batchSize: batch.length,
        totalAnswersSoFar: allAnswers.length,
        remaining: questionsToAnswer.length - allAnswers.length,
      });
    }

    logger.info("Auto-answer questionnaire completed", {
      vendorId: payload.vendorId,
      totalQuestions: payload.questionsAndAnswers.length,
      answered: allAnswers.filter((a) => a.answer).length,
    });

    // Mark as completed
    metadata.set("completed", true);

    return {
      success: true,
      answers: allAnswers,
    };
  },
});

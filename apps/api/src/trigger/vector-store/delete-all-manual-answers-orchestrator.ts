import { logger, metadata, task } from '@trigger.dev/sdk';
import { db } from '@db';
import { deleteManualAnswerTask } from './delete-manual-answer';

const BATCH_SIZE = 50; // Process 50 deletions at a time in parallel

/**
 * Orchestrator task to delete all manual answers from vector database
 * Processes deletions in parallel batches for better performance
 */
export const deleteAllManualAnswersOrchestratorTask = task({
  id: 'delete-all-manual-answers-orchestrator',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: {
    organizationId: string;
    manualAnswerIds?: string[]; // Optional: IDs passed directly to avoid race condition
  }) => {
    logger.info('Starting delete all manual answers from vector DB', {
      organizationId: payload.organizationId,
      manualAnswerIdsProvided: !!payload.manualAnswerIds,
      manualAnswerIdsCount: payload.manualAnswerIds?.length || 0,
    });

    try {
      // Use provided IDs if available, otherwise fetch from DB
      let manualAnswers: Array<{ id: string }>;

      if (payload.manualAnswerIds && payload.manualAnswerIds.length > 0) {
        // Use IDs passed directly (avoids race condition with DB deletion)
        manualAnswers = payload.manualAnswerIds.map((id) => ({ id }));
        logger.info('Using provided manual answer IDs', {
          organizationId: payload.organizationId,
          count: manualAnswers.length,
        });
      } else {
        // Fallback: get all manual answers for the organization
        // This might return empty if DB records were already deleted
        manualAnswers = await db.securityQuestionnaireManualAnswer.findMany({
          where: {
            organizationId: payload.organizationId,
          },
          select: {
            id: true,
          },
        });

        logger.info('Fetched manual answers from DB', {
          organizationId: payload.organizationId,
          count: manualAnswers.length,
        });
      }

      if (manualAnswers.length === 0) {
        logger.info('No manual answers to delete', {
          organizationId: payload.organizationId,
        });
        return {
          success: true,
          deletedCount: 0,
        };
      }

      // Initialize metadata for tracking progress
      metadata.set('totalManualAnswers', manualAnswers.length);
      metadata.set('deletedCount', 0);
      metadata.set('failedCount', 0);
      metadata.set('currentBatch', 0);
      metadata.set(
        'totalBatches',
        Math.ceil(manualAnswers.length / BATCH_SIZE),
      );

      let deletedCount = 0;
      let failedCount = 0;

      // Process deletions in batches
      for (let i = 0; i < manualAnswers.length; i += BATCH_SIZE) {
        const batch = manualAnswers.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(manualAnswers.length / BATCH_SIZE);

        logger.info(
          `Processing deletion batch ${batchNumber}/${totalBatches}`,
          {
            batchSize: batch.length,
            manualAnswerIds: batch.map((ma) => ma.id),
          },
        );

        // Update metadata
        metadata.set('currentBatch', batchNumber);

        // Trigger batch deletions in parallel
        const batchItems = batch.map((ma) => ({
          payload: {
            manualAnswerId: ma.id,
            organizationId: payload.organizationId,
          },
        }));

        const batchHandle =
          await deleteManualAnswerTask.batchTriggerAndWait(batchItems);

        // Process batch results
        batchHandle.runs.forEach((run, batchIdx) => {
          const ma = batch[batchIdx];

          if (run.ok && run.output) {
            const taskResult = run.output;
            if (taskResult.success) {
              deletedCount++;
            } else {
              failedCount++;
              logger.warn('Failed to delete manual answer from vector DB', {
                manualAnswerId: ma.id,
                error: taskResult.error,
              });
            }
          } else {
            failedCount++;
            const errorMessage =
              run.ok === false && run.error
                ? run.error instanceof Error
                  ? run.error.message
                  : String(run.error)
                : 'Unknown error';
            logger.error('Task failed to delete manual answer', {
              manualAnswerId: ma.id,
              error: errorMessage,
            });
          }
        });

        // Update metadata
        metadata.set('deletedCount', deletedCount);
        metadata.set('failedCount', failedCount);

        logger.info(`Batch ${batchNumber}/${totalBatches} completed`, {
          batchSize: batch.length,
          deletedSoFar: deletedCount,
          failedSoFar: failedCount,
          remaining: manualAnswers.length - deletedCount - failedCount,
        });
      }

      logger.info('Delete all manual answers from vector DB completed', {
        organizationId: payload.organizationId,
        total: manualAnswers.length,
        deleted: deletedCount,
        failed: failedCount,
      });

      // Mark as completed
      metadata.set('completed', true);

      return {
        success: true,
        deletedCount,
        failedCount,
        total: manualAnswers.length,
      };
    } catch (error) {
      logger.error('Failed to delete all manual answers from vector DB', {
        organizationId: payload.organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});

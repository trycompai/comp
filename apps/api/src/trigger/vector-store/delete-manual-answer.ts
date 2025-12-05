import { logger, task } from '@trigger.dev/sdk';
import { deleteManualAnswerFromVector } from '@/vector-store/lib/sync/sync-manual-answer';

/**
 * Task to delete a single manual answer from vector database
 * Used by orchestrator for parallel deletion
 */
export const deleteManualAnswerTask = task({
  id: 'delete-manual-answer-from-vector',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { manualAnswerId: string; organizationId: string }) => {
    logger.info('Deleting manual answer from vector DB', {
      manualAnswerId: payload.manualAnswerId,
      organizationId: payload.organizationId,
    });

    try {
      const result = await deleteManualAnswerFromVector(
        payload.manualAnswerId,
        payload.organizationId,
      );

      if (!result.success) {
        logger.warn('Failed to delete manual answer from vector DB', {
          manualAnswerId: payload.manualAnswerId,
          error: result.error,
        });
        return {
          success: false,
          manualAnswerId: payload.manualAnswerId,
          error: result.error,
        };
      }

      logger.info('Successfully deleted manual answer from vector DB', {
        manualAnswerId: payload.manualAnswerId,
      });

      return {
        success: true,
        manualAnswerId: payload.manualAnswerId,
      };
    } catch (error) {
      logger.error('Error deleting manual answer from vector DB', {
        manualAnswerId: payload.manualAnswerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        manualAnswerId: payload.manualAnswerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

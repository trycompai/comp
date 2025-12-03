import { logger, metadata, task } from '@trigger.dev/sdk';
import { processKnowledgeBaseDocumentTask } from './process-knowledge-base-document';

const BATCH_SIZE = 10; // Process 10 documents at a time

/**
 * Orchestrator task to process multiple Knowledge Base documents in parallel batches
 * Similar to vendor-questionnaire-orchestrator, this manages the processing of multiple documents
 */
export const processKnowledgeBaseDocumentsOrchestratorTask = task({
  id: 'process-knowledge-base-documents-orchestrator',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { documentIds: string[]; organizationId: string }) => {
    logger.info('Starting Knowledge Base documents processing orchestrator', {
      organizationId: payload.organizationId,
      documentCount: payload.documentIds.length,
    });

    if (payload.documentIds.length === 0) {
      logger.info('No documents to process');
      return {
        success: true,
        processed: 0,
        failed: 0,
      };
    }

    // Initialize metadata for tracking progress
    metadata.set('documentsTotal', payload.documentIds.length);
    metadata.set('documentsCompleted', 0);
    metadata.set('documentsFailed', 0);
    metadata.set('documentsRemaining', payload.documentIds.length);
    metadata.set('currentBatch', 0);
    metadata.set(
      'totalBatches',
      Math.ceil(payload.documentIds.length / BATCH_SIZE),
    );

    // Initialize individual document statuses - all start as 'pending'
    payload.documentIds.forEach((documentId, index) => {
      metadata.set(`document_${documentId}_status`, 'pending');
    });

    const results: Array<{
      documentId: string;
      success: boolean;
      chunkCount?: number;
      error?: string;
    }> = [];

    // Process documents in batches
    for (let i = 0; i < payload.documentIds.length; i += BATCH_SIZE) {
      const batch = payload.documentIds.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(payload.documentIds.length / BATCH_SIZE);

      logger.info(`Processing batch ${batchNumber}/${totalBatches}`, {
        batchSize: batch.length,
        documentIds: batch,
      });

      // Update metadata
      metadata.set('currentBatch', batchNumber);

      // Mark documents as processing
      batch.forEach((documentId) => {
        metadata.set(`document_${documentId}_status`, 'processing');
      });

      // Use batchTriggerAndWait - this runs tasks in parallel and waits for all to complete
      const batchItems = batch.map((documentId) => ({
        payload: {
          documentId,
          organizationId: payload.organizationId,
        },
      }));

      const batchHandle =
        await processKnowledgeBaseDocumentTask.batchTriggerAndWait(batchItems);

      // Process batch results
      batchHandle.runs.forEach((run, batchIdx) => {
        const documentId = batch[batchIdx];

        if (run.ok && run.output) {
          const taskResult = run.output;
          if (taskResult.success) {
            results.push({
              documentId,
              success: true,
              chunkCount: taskResult.chunkCount,
            });
            metadata.set(`document_${documentId}_status`, 'completed');
            metadata.increment('documentsCompleted');
          } else {
            results.push({
              documentId,
              success: false,
              error: taskResult.error,
            });
            metadata.set(`document_${documentId}_status`, 'failed');
            metadata.increment('documentsFailed');
          }
        } else {
          // Task failed
          const errorMessage =
            run.ok === false && run.error
              ? run.error instanceof Error
                ? run.error.message
                : String(run.error)
              : 'Unknown error';

          logger.error('Document processing task failed', {
            documentId,
            error: errorMessage,
          });
          results.push({
            documentId,
            success: false,
            error: errorMessage,
          });
          metadata.set(`document_${documentId}_status`, 'failed');
          metadata.increment('documentsFailed');
        }
      });

      // Update remaining count
      const completed =
        results.filter((r) => r.success).length +
        results.filter((r) => !r.success).length;
      metadata.set(
        'documentsRemaining',
        payload.documentIds.length - completed,
      );

      logger.info(`Batch ${batchNumber}/${totalBatches} completed`, {
        batchSize: batch.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      });
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info('Knowledge Base documents processing orchestrator completed', {
      organizationId: payload.organizationId,
      total: payload.documentIds.length,
      successful,
      failed,
    });

    // Mark as completed
    metadata.set('completed', true);

    return {
      success: true,
      processed: successful,
      failed,
      results,
    };
  },
});

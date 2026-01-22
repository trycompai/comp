import { logger, task } from '@trigger.dev/sdk';
import { findEmbeddingsForSource } from '@/vector-store/lib/core/find-existing-embeddings';
import { vectorIndex } from '@/vector-store/lib/core/client';
import { db } from '@db';

/**
 * Task to delete all embeddings for a Knowledge Base document from vector database
 */
export const deleteKnowledgeBaseDocumentTask = task({
  id: 'delete-knowledge-base-document-from-vector',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { documentId: string; organizationId: string }) => {
    logger.info('Deleting Knowledge Base document from vector DB', {
      documentId: payload.documentId,
      organizationId: payload.organizationId,
    });

    try {
      // Fetch document info to use document name in query (helps find all chunks)
      let documentName: string | undefined;
      try {
        const document = await db.knowledgeBaseDocument.findUnique({
          where: {
            id: payload.documentId,
            organizationId: payload.organizationId,
          },
          select: {
            name: true,
          },
        });
        documentName = document?.name;
      } catch (dbError) {
        logger.warn('Could not fetch document name, proceeding without it', {
          documentId: payload.documentId,
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        });
      }

      // Find all embeddings for this document
      // Pass documentName to help find all chunks (used in query strategies)
      const existingEmbeddings = await findEmbeddingsForSource(
        payload.documentId,
        'knowledge_base_document',
        payload.organizationId,
        documentName, // Optional: helps find chunks semantically similar to document name
      );

      if (existingEmbeddings.length === 0) {
        logger.info('No embeddings found for document', {
          documentId: payload.documentId,
        });
        return {
          success: true,
          documentId: payload.documentId,
          deletedCount: 0,
        };
      }

      // Delete all embeddings
      if (!vectorIndex) {
        logger.error('Vector index not configured');
        return {
          success: false,
          documentId: payload.documentId,
          error: 'Vector index not configured',
        };
      }

      const idsToDelete = existingEmbeddings.map((e) => e.id);

      if (idsToDelete.length === 0) {
        logger.info('No embeddings to delete for document', {
          documentId: payload.documentId,
        });
        return {
          success: true,
          documentId: payload.documentId,
          deletedCount: 0,
        };
      }

      // Delete all embeddings in batches (Upstash Vector supports batch delete)
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        try {
          await vectorIndex.delete(batch);
          deletedCount += batch.length;
          logger.info('Deleted batch of embeddings', {
            documentId: payload.documentId,
            batchSize: batch.length,
            totalDeleted: deletedCount,
            totalToDelete: idsToDelete.length,
          });
        } catch (batchError) {
          logger.error('Error deleting batch of embeddings', {
            documentId: payload.documentId,
            batchSize: batch.length,
            error:
              batchError instanceof Error
                ? batchError.message
                : 'Unknown error',
          });
          // Continue with next batch even if one fails
        }
      }

      // Verify deletion with retry logic (with delays to allow propagation)
      // This helps catch cases where some chunks might have been missed or not found initially
      // Use the enhanced findEmbeddingsForSource which now includes chunk content queries
      let remainingEmbeddings = await findEmbeddingsForSource(
        payload.documentId,
        'knowledge_base_document',
        payload.organizationId,
        documentName, // Use document name in verification queries too
      );

      logger.info('Initial verification after deletion', {
        documentId: payload.documentId,
        remainingCount: remainingEmbeddings.length,
        remainingIds: remainingEmbeddings.map((e) => e.id),
      });

      // Retry deletion up to 3 times if chunks remain
      let retryAttempt = 0;
      const maxRetries = 3;

      while (remainingEmbeddings.length > 0 && retryAttempt < maxRetries) {
        retryAttempt++;
        logger.warn(
          'Some embeddings were not deleted, attempting retry deletion',
          {
            documentId: payload.documentId,
            remainingCount: remainingEmbeddings.length,
            remainingIds: remainingEmbeddings.map((e) => e.id),
            retryAttempt,
            maxRetries,
          },
        );

        // Wait before retry to allow propagation
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 * retryAttempt),
        ); // Increasing delay

        // Try deleting remaining chunks
        const remainingIds = remainingEmbeddings.map((e) => e.id);
        try {
          // Delete in batches
          const batchSize = 100;
          for (let i = 0; i < remainingIds.length; i += batchSize) {
            const batch = remainingIds.slice(i, i + batchSize);
            await vectorIndex.delete(batch);
            deletedCount += batch.length;
          }

          logger.info('Deleted remaining embeddings in retry attempt', {
            documentId: payload.documentId,
            deletedCount: remainingIds.length,
            retryAttempt,
          });
        } catch (retryError) {
          logger.error('Error deleting remaining embeddings in retry attempt', {
            documentId: payload.documentId,
            retryAttempt,
            error:
              retryError instanceof Error
                ? retryError.message
                : 'Unknown error',
          });
        }

        // Query again to check if deletion was successful
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for propagation
        remainingEmbeddings = await findEmbeddingsForSource(
          payload.documentId,
          'knowledge_base_document',
          payload.organizationId,
          documentName, // Use document name in retry queries too
        );
      }

      // Final verification - if chunks still remain, try one more aggressive search
      if (remainingEmbeddings.length > 0) {
        logger.warn(
          'Chunks still remain after retries, attempting final aggressive search',
          {
            documentId: payload.documentId,
            remainingCount: remainingEmbeddings.length,
            remainingIds: remainingEmbeddings.map((e) => e.id),
          },
        );

        // Wait a bit longer for final attempt
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Try one more time with enhanced search (now includes chunk content queries)
        const finalRemainingEmbeddings = await findEmbeddingsForSource(
          payload.documentId,
          'knowledge_base_document',
          payload.organizationId,
          documentName,
        );

        if (finalRemainingEmbeddings.length > 0) {
          // Try deleting these final chunks
          const finalIds = finalRemainingEmbeddings.map((e) => e.id);
          try {
            await vectorIndex.delete(finalIds);
            deletedCount += finalIds.length;
            logger.info('Deleted chunks in final aggressive attempt', {
              documentId: payload.documentId,
              deletedCount: finalIds.length,
            });
          } catch (finalError) {
            logger.error('Error in final deletion attempt', {
              documentId: payload.documentId,
              error:
                finalError instanceof Error
                  ? finalError.message
                  : 'Unknown error',
            });
          }

          // Final check
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const trulyRemaining = await findEmbeddingsForSource(
            payload.documentId,
            'knowledge_base_document',
            payload.organizationId,
            documentName,
          );

          if (trulyRemaining.length > 0) {
            logger.error(
              'CRITICAL: Some embeddings still remain after all deletion attempts',
              {
                documentId: payload.documentId,
                remainingCount: trulyRemaining.length,
                remainingIds: trulyRemaining.map((e) => e.id),
                remainingChunks: trulyRemaining.map((e) => ({
                  id: e.id,
                  sourceId: e.sourceId,
                  updatedAt: e.updatedAt,
                })),
                note: 'These chunks may need manual deletion or there may be a synchronization issue with Upstash Vector',
              },
            );
          }
        }
      }

      logger.info(
        'Successfully deleted Knowledge Base document embeddings from vector DB',
        {
          documentId: payload.documentId,
          deletedCount,
          totalFound: idsToDelete.length,
        },
      );

      return {
        success: true,
        documentId: payload.documentId,
        deletedCount,
      };
    } catch (error) {
      logger.error('Error deleting Knowledge Base document from vector DB', {
        documentId: payload.documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        documentId: payload.documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

import { logger, task } from '@trigger.dev/sdk';
import { findEmbeddingsForSource } from '@/lib/vector/core/find-existing-embeddings';
import { vectorIndex } from '@/lib/vector/core/client';

/**
 * Task to delete all embeddings for a Knowledge Base document from vector database
 */
export const deleteKnowledgeBaseDocumentTask = task({
  id: 'delete-knowledge-base-document-from-vector',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: {
    documentId: string;
    organizationId: string;
  }) => {
    logger.info('Deleting Knowledge Base document from vector DB', {
      documentId: payload.documentId,
      organizationId: payload.organizationId,
    });

    try {
      // Find all embeddings for this document
      const existingEmbeddings = await findEmbeddingsForSource(
        payload.documentId,
        'knowledge_base_document',
        payload.organizationId,
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
      await vectorIndex.delete(idsToDelete);

      logger.info('Successfully deleted Knowledge Base document embeddings from vector DB', {
        documentId: payload.documentId,
        deletedCount: idsToDelete.length,
      });

      return {
        success: true,
        documentId: payload.documentId,
        deletedCount: idsToDelete.length,
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


import { db } from '@db';
import { vectorIndex } from '../core/client';
import {
  findEmbeddingsForSource,
  type ExistingEmbedding,
} from '../core/find-existing-embeddings';
import { logger } from '../../logger';
import {
  extractContentFromS3Document,
  needsUpdate,
  createChunkItems,
  upsertChunks,
  initSyncStats,
  type SyncStats,
} from './sync-utils';

const DOCUMENT_BATCH_SIZE = 20;

interface KnowledgeBaseDocumentData {
  id: string;
  name: string;
  s3Key: string;
  fileType: string;
  processingStatus: string;
  updatedAt: Date;
}

/**
 * Fetch all knowledge base documents for an organization
 */
export async function fetchKnowledgeBaseDocuments(
  organizationId: string,
): Promise<KnowledgeBaseDocumentData[]> {
  return db.knowledgeBaseDocument.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      s3Key: true,
      fileType: true,
      processingStatus: true,
      updatedAt: true,
    },
  });
}

/**
 * Update document processing status
 */
async function updateDocumentStatus(
  documentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
): Promise<void> {
  try {
    await db.knowledgeBaseDocument.update({
      where: { id: documentId },
      data: {
        processingStatus: status,
        ...(status === 'completed' || status === 'failed'
          ? { processedAt: new Date() }
          : {}),
      },
    });
  } catch (error) {
    logger.error('Failed to update document status', {
      documentId,
      status,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete existing embeddings for a document
 */
async function deleteExistingDocumentEmbeddings(
  documentId: string,
  organizationId: string,
): Promise<void> {
  const existingDocEmbeddings = await findEmbeddingsForSource(
    documentId,
    'knowledge_base_document',
    organizationId,
  );

  if (existingDocEmbeddings.length > 0 && vectorIndex) {
    const idsToDelete = existingDocEmbeddings.map((e) => e.id);
    try {
      await vectorIndex.delete(idsToDelete);
      logger.info('Deleted existing embeddings', {
        documentId,
        deletedCount: idsToDelete.length,
      });
    } catch (error) {
      logger.warn('Failed to delete existing embeddings', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Process a single knowledge base document
 */
async function processSingleDocument(
  document: KnowledgeBaseDocumentData,
  organizationId: string,
): Promise<'processed' | 'failed'> {
  const documentUpdatedAt = document.updatedAt.toISOString();

  logger.info('Processing Knowledge Base document', {
    documentId: document.id,
    organizationId,
    s3Key: document.s3Key,
  });

  await updateDocumentStatus(document.id, 'processing');

  // Extract content from S3
  const content = await extractContentFromS3Document(
    document.s3Key,
    document.fileType,
  );

  if (!content || content.trim().length === 0) {
    logger.warn('No content extracted from document', {
      documentId: document.id,
    });
    await updateDocumentStatus(document.id, 'failed');
    return 'failed';
  }

  // Delete existing embeddings
  await deleteExistingDocumentEmbeddings(document.id, organizationId);

  // Create new embeddings
  const chunkItems = createChunkItems(
    content,
    document.id,
    'knowledge_base_document',
    organizationId,
    documentUpdatedAt,
    'knowledge_base_document',
    { documentName: document.name },
  );

  if (chunkItems.length === 0) {
    logger.warn('No chunks created from content', { documentId: document.id });
    await updateDocumentStatus(document.id, 'failed');
    return 'failed';
  }

  await upsertChunks(chunkItems);
  logger.info('Successfully created embeddings', {
    documentId: document.id,
    embeddingCount: chunkItems.length,
  });

  await updateDocumentStatus(document.id, 'completed');
  return 'processed';
}

/**
 * Filter documents that need processing
 */
function filterDocumentsToProcess(
  documents: KnowledgeBaseDocumentData[],
  existingEmbeddingsMap: Map<string, ExistingEmbedding[]>,
): KnowledgeBaseDocumentData[] {
  return documents.filter((document) => {
    const documentEmbeddings = existingEmbeddingsMap.get(document.id) || [];
    const documentUpdatedAt = document.updatedAt.toISOString();

    return (
      document.processingStatus === 'pending' ||
      document.processingStatus === 'failed' ||
      needsUpdate(documentEmbeddings, documentUpdatedAt)
    );
  });
}

/**
 * Sync all knowledge base documents for an organization
 */
export async function syncKnowledgeBaseDocuments(
  organizationId: string,
  existingEmbeddingsMap: Map<string, ExistingEmbedding[]>,
): Promise<SyncStats> {
  const allDocuments = await fetchKnowledgeBaseDocuments(organizationId);

  logger.info('Found Knowledge Base documents to sync', {
    organizationId,
    count: allDocuments.length,
  });

  const documentsToProcess = filterDocumentsToProcess(
    allDocuments,
    existingEmbeddingsMap,
  );

  const stats = initSyncStats(allDocuments.length);
  stats.skipped = allDocuments.length - documentsToProcess.length;

  // Process documents in parallel batches
  for (let i = 0; i < documentsToProcess.length; i += DOCUMENT_BATCH_SIZE) {
    const batch = documentsToProcess.slice(i, i + DOCUMENT_BATCH_SIZE);

    await Promise.all(
      batch.map(async (document) => {
        try {
          const result = await processSingleDocument(document, organizationId);

          if (result === 'processed') stats.created++;
          else stats.failed++;
        } catch (error) {
          logger.error('Failed to process Knowledge Base document', {
            documentId: document.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          await updateDocumentStatus(document.id, 'failed');
          stats.failed++;
        }
      }),
    );
  }

  logger.info('Knowledge Base documents sync completed', {
    organizationId,
    processed: stats.created,
    skipped: stats.skipped,
    failed: stats.failed,
    total: stats.total,
  });

  return stats;
}

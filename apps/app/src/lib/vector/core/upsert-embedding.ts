import 'server-only';

import { vectorIndex } from './client';
import { generateEmbedding } from './generate-embedding';
import { logger } from '@/utils/logger';

export type SourceType = 'policy' | 'context' | 'document_hub' | 'attachment' | 'questionnaire' | 'manual_answer' | 'knowledge_base_document';

export interface EmbeddingMetadata {
  organizationId: string;
  sourceType: SourceType;
  sourceId: string;
  content: string;
  policyName?: string;
  contextQuestion?: string;
  vendorId?: string;
  vendorName?: string;
  questionnaireQuestion?: string;
  documentName?: string;
  manualAnswerQuestion?: string;
  updatedAt?: string; // ISO timestamp for incremental sync comparison
}

/**
 * Upserts an embedding into Upstash Vector
 * @param id - Unique identifier for this embedding (e.g., "policy_pol123_chunk0")
 * @param text - The text content to embed
 * @param metadata - Metadata associated with this embedding
 */
export async function upsertEmbedding(
  id: string,
  text: string,
  metadata: EmbeddingMetadata,
): Promise<void> {
  if (!vectorIndex) {
    const errorMsg = 'Upstash Vector is not configured - check UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN';
    logger.error(errorMsg, {
      id,
      sourceType: metadata.sourceType,
      hasUrl: !!process.env.UPSTASH_VECTOR_REST_URL,
      hasToken: !!process.env.UPSTASH_VECTOR_REST_TOKEN,
    });
    throw new Error(errorMsg);
  }

  if (!text || text.trim().length === 0) {
    logger.warn('Skipping empty text for embedding', { id, sourceType: metadata.sourceType });
    return;
  }

  try {
    // Generate embedding
    const embedding = await generateEmbedding(text);

    // Prepare metadata
    const vectorMetadata = {
      organizationId: metadata.organizationId,
      sourceType: metadata.sourceType,
      sourceId: metadata.sourceId,
      content: text.substring(0, 1000), // Store first 1000 chars for reference
      ...(metadata.policyName && { policyName: metadata.policyName }),
      ...(metadata.contextQuestion && { contextQuestion: metadata.contextQuestion }),
      ...(metadata.vendorId && { vendorId: metadata.vendorId }),
      ...(metadata.vendorName && { vendorName: metadata.vendorName }),
      ...(metadata.questionnaireQuestion && { questionnaireQuestion: metadata.questionnaireQuestion }),
      ...(metadata.manualAnswerQuestion && { manualAnswerQuestion: metadata.manualAnswerQuestion }),
      ...(metadata.documentName && { documentName: metadata.documentName }),
      ...(metadata.updatedAt && { updatedAt: metadata.updatedAt }),
    };

    // Log detailed info for manual_answer type (for debugging)
    if (metadata.sourceType === 'manual_answer') {
      logger.info('Upserting manual answer embedding', {
        id,
        embeddingId: id,
        vectorLength: embedding.length,
        vectorPreview: embedding.slice(0, 5).map(v => v.toFixed(6)), // First 5 dimensions
        vectorStats: {
          min: Math.min(...embedding),
          max: Math.max(...embedding),
          mean: embedding.reduce((a, b) => a + b, 0) / embedding.length,
        },
        metadata: vectorMetadata,
        textPreview: text.substring(0, 200),
      });
    }

    // Upsert into Upstash Vector
    const upsertResult = await vectorIndex.upsert({
      id,
      vector: embedding,
      metadata: vectorMetadata,
    });

    // Log success for manual_answer type with upsert result
    if (metadata.sourceType === 'manual_answer') {
      logger.info('✅ Successfully upserted manual answer embedding', {
        id,
        embeddingId: id,
        organizationId: metadata.organizationId,
        sourceId: metadata.sourceId,
        upsertResult: upsertResult ? 'success' : 'unknown',
        vectorIndexConfigured: !!vectorIndex,
      });
    }
  } catch (error) {
    logger.error('Failed to upsert embedding', {
      id,
      sourceType: metadata.sourceType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Batch upsert embeddings: generates embeddings in parallel, then upserts in parallel
 * Much faster than sequential upsertEmbedding calls
 * @param items - Array of items to upsert
 */
export async function batchUpsertEmbeddings(
  items: Array<{
    id: string;
    text: string;
    metadata: EmbeddingMetadata;
  }>,
): Promise<void> {
  if (!vectorIndex) {
    throw new Error('Upstash Vector is not configured');
  }

  if (items.length === 0) {
    return;
  }

  // Filter out empty texts
  const validItems = items.filter((item) => item.text && item.text.trim().length > 0);

  if (validItems.length === 0) {
    return;
  }

  try {
    // Step 1: Generate all embeddings in parallel (much faster)
    const embeddings = await Promise.all(
      validItems.map((item) => generateEmbedding(item.text)),
    );

    // Step 2: Upsert all embeddings in parallel
    // Check vectorIndex before using it (TypeScript safety)
    if (!vectorIndex) {
      throw new Error('Upstash Vector is not configured');
    }

    // Store reference to avoid null check issues in map
    const index = vectorIndex;

    await Promise.all(
      validItems.map((item, idx) => {
        const embedding = embeddings[idx];
        return index.upsert({
          id: item.id,
          vector: embedding,
          metadata: {
            organizationId: item.metadata.organizationId,
            sourceType: item.metadata.sourceType,
            sourceId: item.metadata.sourceId,
            content: item.text.substring(0, 1000), // Store first 1000 chars for reference
            ...(item.metadata.policyName && { policyName: item.metadata.policyName }),
            ...(item.metadata.contextQuestion && { contextQuestion: item.metadata.contextQuestion }),
            ...(item.metadata.vendorId && { vendorId: item.metadata.vendorId }),
            ...(item.metadata.vendorName && { vendorName: item.metadata.vendorName }),
            ...(item.metadata.questionnaireQuestion && {
              questionnaireQuestion: item.metadata.questionnaireQuestion,
            }),
            ...(item.metadata.manualAnswerQuestion && {
              manualAnswerQuestion: item.metadata.manualAnswerQuestion,
            }),
            ...(item.metadata.documentName && { documentName: item.metadata.documentName }),
            ...(item.metadata.updatedAt && { updatedAt: item.metadata.updatedAt }),
          },
        });
      }),
    );
  } catch (error) {
    logger.error('Failed to batch upsert embeddings', {
      itemCount: validItems.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}


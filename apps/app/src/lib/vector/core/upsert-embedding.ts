import 'server-only';

import { vectorIndex } from './client';
import { generateEmbedding } from './generate-embedding';
import { logger } from '@/utils/logger';

export type SourceType = 'policy' | 'context' | 'document_hub' | 'attachment' | 'questionnaire';

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
    throw new Error('Upstash Vector is not configured');
  }

  if (!text || text.trim().length === 0) {
    logger.warn('Skipping empty text for embedding', { id, sourceType: metadata.sourceType });
    return;
  }

  try {
    // Generate embedding
    const embedding = await generateEmbedding(text);

    // Upsert into Upstash Vector
    await vectorIndex.upsert({
      id,
      vector: embedding,
      metadata: {
        organizationId: metadata.organizationId,
        sourceType: metadata.sourceType,
        sourceId: metadata.sourceId,
        content: text.substring(0, 1000), // Store first 1000 chars for reference
        ...(metadata.policyName && { policyName: metadata.policyName }),
        ...(metadata.contextQuestion && { contextQuestion: metadata.contextQuestion }),
        ...(metadata.vendorId && { vendorId: metadata.vendorId }),
        ...(metadata.vendorName && { vendorName: metadata.vendorName }),
        ...(metadata.questionnaireQuestion && { questionnaireQuestion: metadata.questionnaireQuestion }),
      },
    });

    logger.info('Successfully upserted embedding', {
      id,
      sourceType: metadata.sourceType,
      sourceId: metadata.sourceId,
    });
  } catch (error) {
    logger.error('Failed to upsert embedding', {
      id,
      sourceType: metadata.sourceType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}


import 'server-only';

import { upsertEmbedding } from '../core/upsert-embedding';
import { vectorIndex } from '../core/client';
import { db } from '@db';
import { logger } from '@/utils/logger';

/**
 * Syncs a single manual answer to vector database SYNCHRONOUSLY
 * Fast operation (~1-2 seconds) - acceptable for UX
 * This ensures manual answers are immediately available for answer generation
 */
export async function syncManualAnswerToVector(
  manualAnswerId: string,
  organizationId: string,
): Promise<{ success: boolean; error?: string; embeddingId?: string }> {
  // Check if vectorIndex is configured
  if (!vectorIndex) {
    logger.error('❌ Upstash Vector not configured - check UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN', {
      manualAnswerId,
      organizationId,
      hasUrl: !!process.env.UPSTASH_VECTOR_REST_URL,
      hasToken: !!process.env.UPSTASH_VECTOR_REST_TOKEN,
    });
    return { success: false, error: 'Vector DB not configured' };
  }

  logger.info('🔍 Vector Index configuration check', {
    vectorIndexExists: !!vectorIndex,
    manualAnswerId,
    organizationId,
  });

  try {
    const manualAnswer = await db.securityQuestionnaireManualAnswer.findUnique({
      where: { id: manualAnswerId, organizationId },
    });

    if (!manualAnswer) {
      logger.warn('Manual answer not found for sync', { manualAnswerId, organizationId });
      return { success: false, error: 'Manual answer not found' };
    }

    // Create embedding ID: manual_answer_{id}
    const embeddingId = `manual_answer_${manualAnswerId}`;
    
    // Combine question and answer for better semantic search
    const text = `${manualAnswer.question}\n\n${manualAnswer.answer}`;

    logger.info('🔄 Starting sync manual answer to vector DB', {
      manualAnswerId,
      organizationId,
      embeddingId,
      question: manualAnswer.question.substring(0, 100),
      answer: manualAnswer.answer.substring(0, 100),
      textLength: text.length,
    });

    await upsertEmbedding(embeddingId, text, {
      organizationId,
      sourceType: 'manual_answer',
      sourceId: manualAnswerId,
      content: text,
      manualAnswerQuestion: manualAnswer.question, // Store question for source identification
      updatedAt: manualAnswer.updatedAt.toISOString(),
    });

    // Verify the embedding was actually added by querying for it
    try {
      const { findEmbeddingsForSource } = await import('../core/find-existing-embeddings');
      const foundEmbeddings = await findEmbeddingsForSource(
        manualAnswerId,
        'manual_answer',
        organizationId,
      );
      
      const wasFound = foundEmbeddings.some((e) => e.id === embeddingId);
      
      logger.info('✅ Successfully synced manual answer to vector DB', {
        manualAnswerId,
        organizationId,
        embeddingId,
        question: manualAnswer.question.substring(0, 100),
        answer: manualAnswer.answer.substring(0, 100),
        verified: wasFound,
        foundEmbeddingsCount: foundEmbeddings.length,
        foundEmbeddingIds: foundEmbeddings.map((e) => e.id),
        metadata: {
          organizationId,
          sourceType: 'manual_answer',
          sourceId: manualAnswerId,
          updatedAt: manualAnswer.updatedAt.toISOString(),
        },
      });

      if (!wasFound) {
        logger.warn('⚠️ Embedding was upserted but not found in verification query', {
          embeddingId,
          manualAnswerId,
          organizationId,
        });
      }
    } catch (verifyError) {
      logger.warn('Failed to verify embedding after upsert', {
        embeddingId,
        manualAnswerId,
        error: verifyError instanceof Error ? verifyError.message : 'Unknown error',
      });
    }
    return {
      success: true,
      embeddingId, // Return embedding ID for verification
    };
  } catch (error) {
    logger.error('Failed to sync manual answer to vector DB', {
      manualAnswerId,
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Deletes manual answer from vector database
 * Called when manual answer is deleted
 */
export async function deleteManualAnswerFromVector(
  manualAnswerId: string,
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!vectorIndex) {
    return { success: false, error: 'Vector DB not configured' };
  }

  try {
    // Find existing embeddings for this manual answer
    // We need to search for embeddings with this sourceId
    const embeddingId = `manual_answer_${manualAnswerId}`;
    
    // Try to delete directly by ID (most efficient)
    try {
      await vectorIndex.delete([embeddingId]);
      logger.info('Deleted manual answer from vector DB', {
        manualAnswerId,
        organizationId,
        embeddingId,
      });
      return { success: true };
    } catch (deleteError) {
      // If direct delete fails (embedding might not exist), log and continue
      logger.warn('Failed to delete manual answer embedding (may not exist)', {
        manualAnswerId,
        embeddingId,
        error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
      });
      // Still return success - embedding might not exist
      return { success: true };
    }
  } catch (error) {
    logger.error('Failed to delete manual answer from vector DB', {
      manualAnswerId,
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


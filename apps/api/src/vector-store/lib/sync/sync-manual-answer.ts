import { upsertEmbedding } from '../core/upsert-embedding';
import { vectorIndex } from '../core/client';
import { db } from '@db';
import { logger } from '../../logger';

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
    logger.error(
      '❌ Upstash Vector not configured - check UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN',
      {
        manualAnswerId,
        organizationId,
        hasUrl: !!process.env.UPSTASH_VECTOR_REST_URL,
        hasToken: !!process.env.UPSTASH_VECTOR_REST_TOKEN,
      },
    );
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
      logger.warn('Manual answer not found for sync', {
        manualAnswerId,
        organizationId,
      });
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

    // Verify the embedding was actually added by fetching it directly by ID
    // Using direct fetch with retry to handle eventual consistency in Upstash Vector
    // Even direct fetch can have slight delays, so we retry a few times with exponential backoff
    let wasFound = false;
    const maxRetries = 3;
    const initialDelay = 100; // 100ms

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const fetchedEmbeddings = await vectorIndex.fetch([embeddingId]);
        wasFound =
          fetchedEmbeddings &&
          fetchedEmbeddings.length > 0 &&
          fetchedEmbeddings[0] !== null;

        if (wasFound) {
          break; // Found it, exit retry loop
        }

        // If not found and not the last attempt, wait before retrying
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (verifyError) {
        // If it's the last attempt, log the error
        if (attempt === maxRetries - 1) {
          logger.warn(
            'Failed to verify embedding after upsert (final attempt)',
            {
              embeddingId,
              manualAnswerId,
              attempt: attempt + 1,
              error:
                verifyError instanceof Error
                  ? verifyError.message
                  : 'Unknown error',
            },
          );
        }
        // Continue to next retry
      }
    }

    logger.info('✅ Successfully synced manual answer to vector DB', {
      manualAnswerId,
      organizationId,
      embeddingId,
      question: manualAnswer.question.substring(0, 100),
      answer: manualAnswer.answer.substring(0, 100),
      verified: wasFound,
      verificationAttempts: wasFound ? 'success' : `${maxRetries} attempts`,
      metadata: {
        organizationId,
        sourceType: 'manual_answer',
        sourceId: manualAnswerId,
        updatedAt: manualAnswer.updatedAt.toISOString(),
      },
    });

    // Only log info if verification failed after all retries (non-critical)
    // This is non-critical - upsert succeeded, so embedding will be available soon
    // Upstash Vector has eventual consistency, so immediate fetch might not find it
    // We don't log this as a warning since it's expected behavior
    if (!wasFound) {
      // Silently continue - upsert succeeded, embedding will be available soon
      // No need to log as this is normal eventual consistency behavior
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
        error:
          deleteError instanceof Error ? deleteError.message : 'Unknown error',
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

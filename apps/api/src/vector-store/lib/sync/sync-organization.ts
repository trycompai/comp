import { db } from '@db';
import { vectorIndex } from '../core/client';
import {
  findAllOrganizationEmbeddings,
  type ExistingEmbedding,
} from '../core/find-existing-embeddings';
import { batchUpsertEmbeddings } from '../core/upsert-embedding';
import { logger } from '../../logger';
import { syncPolicies, fetchPolicies } from './sync-policies';
import { syncContextEntries, fetchContextEntries } from './sync-context';
import {
  syncKnowledgeBaseDocuments,
  fetchKnowledgeBaseDocuments,
} from './sync-knowledge-base';
import type { SyncStats } from './sync-utils';

/**
 * Lock map to prevent concurrent syncs for the same organization
 */
const syncLocks = new Map<string, Promise<void>>();

/**
 * Full resync of organization embeddings
 * Uses a lock mechanism to prevent concurrent syncs for the same organization.
 */
export async function syncOrganizationEmbeddings(
  organizationId: string,
): Promise<void> {
  if (!organizationId || organizationId.trim().length === 0) {
    logger.warn('Invalid organizationId provided for sync');
    return;
  }

  // Check if sync is already in progress
  const existingSync = syncLocks.get(organizationId);
  if (existingSync) {
    logger.info('Sync already in progress, waiting for completion', {
      organizationId,
    });
    return existingSync;
  }

  // Create and store new sync promise
  const syncPromise = performSync(organizationId);
  syncLocks.set(organizationId, syncPromise);

  // Clean up lock when sync completes
  syncPromise
    .finally(() => {
      syncLocks.delete(organizationId);
      logger.info('Sync lock released', { organizationId });
    })
    .catch(() => {
      // Error already logged in performSync
    });

  return syncPromise;
}

/**
 * Internal function that performs the actual sync operation
 */
async function performSync(organizationId: string): Promise<void> {
  logger.info('Starting incremental organization embeddings sync', {
    organizationId,
  });

  try {
    // Step 1: Fetch all existing embeddings once
    const existingEmbeddings =
      await findAllOrganizationEmbeddings(organizationId);
    logger.info('Fetched existing embeddings', {
      organizationId,
      totalSources: existingEmbeddings.size,
    });

    // Step 2: Sync policies
    const policyStats = await syncPolicies(organizationId, existingEmbeddings);

    // Step 3: Sync context entries
    const contextStats = await syncContextEntries(
      organizationId,
      existingEmbeddings,
    );

    // Step 4: Sync manual answers
    const manualAnswerStats = await syncManualAnswers(
      organizationId,
      existingEmbeddings,
    );

    // Step 5: Sync Knowledge Base documents
    const kbDocStats = await syncKnowledgeBaseDocuments(
      organizationId,
      existingEmbeddings,
    );

    // Step 6: Delete orphaned embeddings
    const orphanedDeleted = await deleteOrphanedEmbeddings(
      organizationId,
      existingEmbeddings,
    );

    // Step 7: Verify embeddings are queryable (handles Upstash eventual consistency)
    // Only verify if we actually created or updated any embeddings
    const totalCreated =
      policyStats.created +
      contextStats.created +
      manualAnswerStats.created +
      kbDocStats.created;
    const totalUpdated =
      policyStats.updated +
      contextStats.updated +
      manualAnswerStats.updated +
      kbDocStats.updated;

    // Find the last upserted embedding ID (prioritize knowledge base, then manual answers, then context, then policies)
    // This ensures we verify the most recently upserted embedding
    const lastUpsertedEmbeddingId =
      kbDocStats.lastUpsertedEmbeddingId ??
      manualAnswerStats.lastUpsertedEmbeddingId ??
      contextStats.lastUpsertedEmbeddingId ??
      policyStats.lastUpsertedEmbeddingId ??
      null;

    if ((totalCreated > 0 || totalUpdated > 0) && lastUpsertedEmbeddingId) {
      const verificationResult = await verifyEmbeddingIsReady(
        lastUpsertedEmbeddingId,
        organizationId,
      );
      logger.info('Embeddings verification completed', {
        organizationId,
        embeddingId: lastUpsertedEmbeddingId,
        verified: verificationResult.success,
        attempts: verificationResult.attempts,
        totalWaitMs: verificationResult.totalWaitMs,
      });
    } else if (totalCreated > 0 || totalUpdated > 0) {
      logger.warn(
        'Embeddings were created/updated but no embedding ID tracked for verification',
        { organizationId, totalCreated, totalUpdated },
      );
    } else {
      logger.info('Skipping verification - no new embeddings created/updated', {
        organizationId,
      });
    }

    logger.info('Incremental organization embeddings sync completed', {
      organizationId,
      policies: policyStats,
      context: contextStats,
      manualAnswers: manualAnswerStats,
      knowledgeBaseDocuments: kbDocStats,
      orphanedDeleted,
    });
  } catch (error) {
    logger.error('Failed to sync organization embeddings', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Verifies that embeddings are indexed and QUERYABLE after sync.
 * Uses retry with exponential backoff to handle Upstash Vector's eventual consistency.
 *
 * IMPORTANT: We use vectorIndex.query() instead of fetch() because:
 * - fetch() checks if data is stored (works immediately)
 * - query() checks if data is INDEXED for semantic search (may have delay)
 *
 * The embedding must be queryable, not just fetchable, for RAG to work.
 */
async function verifyEmbeddingIsReady(
  embeddingId: string,
  organizationId: string,
): Promise<{
  success: boolean;
  attempts: number;
  totalWaitMs: number;
}> {
  if (!vectorIndex) {
    logger.warn('Vector index not configured, skipping verification');
    return { success: false, attempts: 0, totalWaitMs: 0 };
  }

  const maxRetries = 8;
  const initialDelay = 300; // 300ms
  let totalWaitMs = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // First, fetch the embedding to get its vector
      const fetchedEmbeddings = await vectorIndex.fetch([embeddingId], {
        includeVectors: true,
      });

      const fetchedEmbedding = fetchedEmbeddings?.[0];
      if (!fetchedEmbedding || !fetchedEmbedding.vector) {
        // Embedding not even stored yet, wait and retry
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          logger.info('Embedding not yet stored, waiting before retry', {
            organizationId,
            embeddingId,
            attempt,
            nextDelayMs: delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          totalWaitMs += delay;
        }
        continue;
      }

      // Now query using the embedding's own vector to verify it's INDEXED
      // If the embedding is indexed, querying with its own vector should return itself
      const queryResults = await vectorIndex.query({
        vector: fetchedEmbedding.vector as number[],
        topK: 1,
        filter: `organizationId = "${organizationId}"`,
        includeMetadata: true,
      });

      // Check if our embedding appears in the query results
      const isIndexed = queryResults.some((result) => result.id === embeddingId);

      if (isIndexed) {
        logger.info('Embedding verification succeeded - indexed and queryable', {
          organizationId,
          embeddingId,
          attempt,
          totalWaitMs,
        });
        return { success: true, attempts: attempt, totalWaitMs };
      }

      // Embedding is stored but not yet indexed for search
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // 300ms, 600ms, 1200ms, 2400ms...
        logger.info('Embedding stored but not yet indexed, waiting before retry', {
          organizationId,
          embeddingId,
          attempt,
          nextDelayMs: delay,
          queryResultCount: queryResults.length,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        totalWaitMs += delay;
      }
    } catch (error) {
      logger.warn('Verification query failed', {
        organizationId,
        embeddingId,
        attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue to next retry
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        totalWaitMs += delay;
      }
    }
  }

  // All retries exhausted
  logger.warn('Embedding verification failed after all retries', {
    organizationId,
    embeddingId,
    attempts: maxRetries,
    totalWaitMs,
  });
  return { success: false, attempts: maxRetries, totalWaitMs };
}

/**
 * Sync manual answers for an organization
 */
async function syncManualAnswers(
  organizationId: string,
  existingEmbeddings: Map<string, ExistingEmbedding[]>,
): Promise<SyncStats> {
  const manualAnswers = await db.securityQuestionnaireManualAnswer.findMany({
    where: { organizationId },
    select: {
      id: true,
      question: true,
      answer: true,
      updatedAt: true,
    },
  });

  logger.info('Syncing manual answers', {
    organizationId,
    count: manualAnswers.length,
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let lastUpsertedEmbeddingId: string | null = null;

  if (manualAnswers.length > 0) {
    const itemsToUpsert = manualAnswers
      .map((ma) => {
        const embeddingId = `manual_answer_${ma.id}`;
        const text = `${ma.question}\n\n${ma.answer}`;
        const updatedAt = ma.updatedAt.toISOString();

        const existing = existingEmbeddings.get(ma.id) || [];
        const needsUpdate =
          existing.length === 0 || existing[0]?.updatedAt !== updatedAt;

        if (!needsUpdate) {
          skipped++;
          return null;
        }

        if (existing.length === 0) created++;
        else updated++;

        return {
          id: embeddingId,
          text,
          metadata: {
            organizationId,
            sourceType: 'manual_answer' as const,
            sourceId: ma.id,
            content: text,
            manualAnswerQuestion: ma.question,
            updatedAt,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Filter out items with empty text (same filter as batchUpsertEmbeddings)
    // This ensures we only track IDs that will actually be upserted
    const validItems = itemsToUpsert.filter(
      (item) => item.text && item.text.trim().length > 0,
    );

    if (validItems.length > 0) {
      await batchUpsertEmbeddings(validItems);
      // Track the last ACTUALLY upserted embedding ID
      lastUpsertedEmbeddingId = validItems[validItems.length - 1]?.id ?? null;
    }
  }

  logger.info('Manual answers sync completed', {
    organizationId,
    created,
    updated,
    skipped,
    total: manualAnswers.length,
  });

  return {
    created,
    updated,
    skipped,
    failed: 0,
    total: manualAnswers.length,
    lastUpsertedEmbeddingId,
  };
}

/**
 * Delete orphaned embeddings (sources that no longer exist in DB)
 */
async function deleteOrphanedEmbeddings(
  organizationId: string,
  existingEmbeddings: Map<string, ExistingEmbedding[]>,
): Promise<number> {
  // Fetch current DB IDs
  const [policies, contextEntries, manualAnswers, kbDocuments] =
    await Promise.all([
      fetchPolicies(organizationId),
      fetchContextEntries(organizationId),
      db.securityQuestionnaireManualAnswer.findMany({
        where: { organizationId },
        select: { id: true },
      }),
      fetchKnowledgeBaseDocuments(organizationId),
    ]);

  const dbPolicyIds = new Set(policies.map((p) => p.id));
  const dbContextIds = new Set(contextEntries.map((c) => c.id));
  const dbManualAnswerIds = new Set(manualAnswers.map((ma) => ma.id));
  const dbKbDocIds = new Set(kbDocuments.map((d) => d.id));

  let orphanedDeleted = 0;

  for (const [sourceId, embeddings] of existingEmbeddings.entries()) {
    const sourceType = embeddings[0]?.sourceType;
    if (!sourceType) continue;

    const shouldExist =
      (sourceType === 'policy' && dbPolicyIds.has(sourceId)) ||
      (sourceType === 'context' && dbContextIds.has(sourceId)) ||
      (sourceType === 'manual_answer' && dbManualAnswerIds.has(sourceId)) ||
      (sourceType === 'knowledge_base_document' && dbKbDocIds.has(sourceId));

    if (!shouldExist && vectorIndex) {
      const idsToDelete = embeddings.map((e) => e.id);
      try {
        await vectorIndex.delete(idsToDelete);
        orphanedDeleted += idsToDelete.length;
        logger.info('Deleted orphaned embeddings', {
          sourceId,
          sourceType,
          deletedCount: idsToDelete.length,
        });
      } catch (error) {
        logger.warn('Failed to delete orphaned embeddings', {
          sourceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  return orphanedDeleted;
}

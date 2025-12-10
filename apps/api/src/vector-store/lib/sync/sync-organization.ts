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
 * Sync manual answers for an organization
 */
async function syncManualAnswers(
  organizationId: string,
  existingEmbeddings: Map<string, ExistingEmbedding[]>,
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  total: number;
}> {
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

    if (itemsToUpsert.length > 0) {
      await batchUpsertEmbeddings(itemsToUpsert);
    }
  }

  logger.info('Manual answers sync completed', {
    organizationId,
    created,
    updated,
    skipped,
    total: manualAnswers.length,
  });

  return { created, updated, skipped, total: manualAnswers.length };
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

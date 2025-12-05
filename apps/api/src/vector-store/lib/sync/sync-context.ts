import { db } from '@db';
import { logger } from '../../logger';
import type { ExistingEmbedding } from '../core/find-existing-embeddings';
import {
  needsUpdate,
  deleteOldEmbeddings,
  createChunkItems,
  upsertChunks,
  initSyncStats,
  type SyncStats,
} from './sync-utils';

const CONTEXT_BATCH_SIZE = 100;

interface ContextData {
  id: string;
  question: string;
  answer: string;
  organizationId: string;
  updatedAt: Date;
}

/**
 * Fetch all context entries for an organization
 */
export async function fetchContextEntries(
  organizationId: string,
): Promise<ContextData[]> {
  return db.context.findMany({
    where: { organizationId },
    select: {
      id: true,
      question: true,
      answer: true,
      organizationId: true,
      updatedAt: true,
    },
  });
}

/**
 * Sync a single context entry's embeddings
 */
async function syncSingleContext(
  context: ContextData,
  existingEmbeddings: ExistingEmbedding[],
  organizationId: string,
): Promise<'created' | 'updated' | 'skipped'> {
  const contextUpdatedAt = context.updatedAt.toISOString();

  // Check if context needs update
  if (!needsUpdate(existingEmbeddings, contextUpdatedAt)) {
    return 'skipped';
  }

  // Delete old embeddings if they exist
  await deleteOldEmbeddings(existingEmbeddings, { contextId: context.id });

  // Create new embeddings
  const contextText = `Question: ${context.question}\n\nAnswer: ${context.answer}`;

  if (!contextText || contextText.trim().length === 0) {
    return 'skipped';
  }

  // Use larger chunk size for context entries
  const chunkItems = createChunkItems(
    contextText,
    context.id,
    'context',
    organizationId,
    contextUpdatedAt,
    'context',
    { contextQuestion: context.question },
    8000, // Larger chunk size for context
    50,
  );

  if (chunkItems.length === 0) {
    return 'skipped';
  }

  await upsertChunks(chunkItems);

  return existingEmbeddings.length === 0 ? 'created' : 'updated';
}

/**
 * Sync all context entries for an organization
 */
export async function syncContextEntries(
  organizationId: string,
  existingEmbeddingsMap: Map<string, ExistingEmbedding[]>,
): Promise<SyncStats> {
  const contextEntries = await fetchContextEntries(organizationId);

  logger.info('Found context entries to sync', {
    organizationId,
    count: contextEntries.length,
  });

  const stats = initSyncStats(contextEntries.length);

  // Process context entries in parallel batches
  for (let i = 0; i < contextEntries.length; i += CONTEXT_BATCH_SIZE) {
    const batch = contextEntries.slice(i, i + CONTEXT_BATCH_SIZE);

    await Promise.all(
      batch.map(async (context) => {
        try {
          const contextEmbeddings = existingEmbeddingsMap.get(context.id) || [];
          const result = await syncSingleContext(
            context,
            contextEmbeddings,
            organizationId,
          );

          if (result === 'created') stats.created++;
          else if (result === 'updated') stats.updated++;
          else stats.skipped++;
        } catch (error) {
          logger.error('Failed to sync context', {
            contextId: context.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          stats.failed++;
        }
      }),
    );
  }

  logger.info('Context sync completed', {
    organizationId,
    ...stats,
  });

  return stats;
}

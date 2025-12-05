import { db } from '@db';
import { extractTextFromPolicy } from '../utils/extract-policy-text';
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

const POLICY_BATCH_SIZE = 100;

interface PolicyData {
  id: string;
  name: string;
  description: string | null;
  content: unknown;
  organizationId: string;
  updatedAt: Date;
}

/**
 * Fetch all published policies for an organization
 */
export async function fetchPolicies(
  organizationId: string,
): Promise<PolicyData[]> {
  return db.policy.findMany({
    where: {
      organizationId,
      status: 'published',
    },
    select: {
      id: true,
      name: true,
      description: true,
      content: true,
      organizationId: true,
      updatedAt: true,
    },
  });
}

/**
 * Sync a single policy's embeddings
 */
async function syncSinglePolicy(
  policy: PolicyData,
  existingEmbeddings: ExistingEmbedding[],
  organizationId: string,
): Promise<'created' | 'updated' | 'skipped'> {
  const policyUpdatedAt = policy.updatedAt.toISOString();

  // Check if policy needs update
  if (!needsUpdate(existingEmbeddings, policyUpdatedAt)) {
    return 'skipped';
  }

  // Delete old embeddings if they exist
  await deleteOldEmbeddings(existingEmbeddings, { policyId: policy.id });

  // Create new embeddings
  const policyText = extractTextFromPolicy(
    policy as Parameters<typeof extractTextFromPolicy>[0],
  );

  if (!policyText || policyText.trim().length === 0) {
    return 'skipped';
  }

  const chunkItems = createChunkItems(
    policyText,
    policy.id,
    'policy',
    organizationId,
    policyUpdatedAt,
    'policy',
    { policyName: policy.name },
  );

  if (chunkItems.length === 0) {
    return 'skipped';
  }

  await upsertChunks(chunkItems);

  return existingEmbeddings.length === 0 ? 'created' : 'updated';
}

/**
 * Sync all policies for an organization
 */
export async function syncPolicies(
  organizationId: string,
  existingEmbeddingsMap: Map<string, ExistingEmbedding[]>,
): Promise<SyncStats> {
  const policies = await fetchPolicies(organizationId);

  logger.info('Found policies to sync', {
    organizationId,
    count: policies.length,
  });

  const stats = initSyncStats(policies.length);

  // Process policies in parallel batches
  for (let i = 0; i < policies.length; i += POLICY_BATCH_SIZE) {
    const batch = policies.slice(i, i + POLICY_BATCH_SIZE);

    await Promise.all(
      batch.map(async (policy) => {
        try {
          const policyEmbeddings = existingEmbeddingsMap.get(policy.id) || [];
          const result = await syncSinglePolicy(
            policy,
            policyEmbeddings,
            organizationId,
          );

          if (result === 'created') stats.created++;
          else if (result === 'updated') stats.updated++;
          else stats.skipped++;
        } catch (error) {
          logger.error('Failed to sync policy', {
            policyId: policy.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          stats.failed++;
        }
      }),
    );
  }

  logger.info('Policies sync completed', {
    organizationId,
    ...stats,
  });

  return stats;
}

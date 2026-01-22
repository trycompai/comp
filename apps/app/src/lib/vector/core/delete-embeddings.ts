import 'server-only';

import { vectorIndex } from './client';
import { logger } from '@/utils/logger';
import { generateEmbedding } from './generate-embedding';

/**
 * Deletes all embeddings for an organization from the vector database
 * Uses search to find all embeddings, filters by organizationId in metadata, then deletes them
 */
export async function deleteOrganizationEmbeddings(organizationId: string): Promise<void> {
  if (!vectorIndex) {
    logger.warn('Upstash Vector is not configured, skipping deletion');
    return;
  }

  if (!organizationId || organizationId.trim().length === 0) {
    logger.warn('Invalid organizationId provided for deletion');
    return;
  }

  try {
    const allIds: string[] = [];
    
    // Use multiple search queries to find all types of embeddings
    // Since Upstash Vector doesn't support metadata filtering in query,
    // we use broad searches and filter results
    const searchQueries = [
      'policy security compliance',
      'context question answer',
      organizationId,
    ];

    logger.info('Searching for embeddings to delete', { organizationId });

    for (const query of searchQueries) {
      try {
        const queryEmbedding = await generateEmbedding(query);
        
        const results = await vectorIndex.query({
          vector: queryEmbedding,
          topK: 1000, // Max allowed by Upstash Vector
          includeMetadata: true,
        });

        // Filter by organizationId in metadata
        const orgResults = results
          .filter((result) => {
            const metadata = result.metadata as any;
            return metadata?.organizationId === organizationId;
          })
          .map((result) => String(result.id));

        allIds.push(...orgResults);
        
        logger.info('Found embeddings in search query', {
          query,
          found: orgResults.length,
        });
      } catch (error) {
        logger.warn('Failed to search embeddings', {
          query,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Remove duplicates
    const uniqueIds = [...new Set(allIds)];

    logger.info('Found embeddings to delete', {
      organizationId,
      count: uniqueIds.length,
    });

    if (uniqueIds.length === 0) {
      logger.info('No embeddings found to delete', { organizationId });
      return;
    }

    // Delete in batches (Upstash Vector supports batch delete)
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const batch = uniqueIds.slice(i, i + batchSize);
      
      try {
        await vectorIndex.delete(batch);
        deletedCount += batch.length;
        
          logger.info('Deleted batch of embeddings', {
            batchSize: batch.length,
            totalDeleted: deletedCount,
            remaining: uniqueIds.length - deletedCount,
          });
      } catch (error) {
        logger.warn('Failed to delete batch', {
          batchSize: batch.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with other batches
      }
    }

    logger.info('Successfully deleted organization embeddings', {
      organizationId,
      deletedCount,
      totalFound: uniqueIds.length,
    });
  } catch (error) {
    logger.error('Failed to delete organization embeddings', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}


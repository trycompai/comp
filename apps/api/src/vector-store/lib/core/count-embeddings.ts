import { vectorIndex } from './client';
import { generateEmbedding } from './generate-embedding';
import { logger } from '../../logger';

/**
 * Counts embeddings for a specific organization and source type
 * Useful for debugging and verification
 */
export async function countEmbeddings(
  organizationId: string,
  sourceType?: 'policy' | 'context' | 'manual_answer',
): Promise<{
  total: number;
  bySourceType: Record<string, number>;
  error?: string;
}> {
  if (!vectorIndex) {
    return {
      total: 0,
      bySourceType: {},
      error: 'Vector DB not configured',
    };
  }

  try {
    // Use organizationId as query to find all embeddings
    const queryEmbedding = await generateEmbedding(organizationId);

    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: 100, // Max allowed by Upstash Vector
      includeMetadata: true,
    });

    // Filter by organizationId
    const orgResults = results.filter((result) => {
      const metadata = result.metadata as any;
      return metadata?.organizationId === organizationId;
    });

    // Count by sourceType
    const bySourceType: Record<string, number> = {};
    let total = 0;

    for (const result of orgResults) {
      const metadata = result.metadata as any;
      const st = metadata?.sourceType || 'unknown';

      if (!sourceType || st === sourceType) {
        bySourceType[st] = (bySourceType[st] || 0) + 1;
        total++;
      }
    }

    logger.info('Counted embeddings', {
      organizationId,
      sourceType: sourceType || 'all',
      total,
      bySourceType,
    });

    return {
      total,
      bySourceType,
    };
  } catch (error) {
    logger.error('Failed to count embeddings', {
      organizationId,
      sourceType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      total: 0,
      bySourceType: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Lists all manual answer embeddings for an organization
 * Useful for debugging
 */
export async function listManualAnswerEmbeddings(
  organizationId: string,
): Promise<
  Array<{
    id: string;
    sourceId: string;
    content: string;
    updatedAt?: string;
  }>
> {
  if (!vectorIndex) {
    return [];
  }

  try {
    // Use organizationId as query
    const queryEmbedding = await generateEmbedding(organizationId);

    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: 100,
      includeMetadata: true,
    });

    // Filter for manual_answer type
    const manualAnswerEmbeddings = results
      .filter((result) => {
        const metadata = result.metadata as any;
        return (
          metadata?.organizationId === organizationId &&
          metadata?.sourceType === 'manual_answer'
        );
      })
      .map((result) => {
        const metadata = result.metadata as any;
        return {
          id: String(result.id),
          sourceId: metadata?.sourceId || '',
          content: metadata?.content || '',
          updatedAt: metadata?.updatedAt,
        };
      });

    logger.info('Listed manual answer embeddings', {
      organizationId,
      count: manualAnswerEmbeddings.length,
      ids: manualAnswerEmbeddings.map((e) => e.id),
    });

    return manualAnswerEmbeddings;
  } catch (error) {
    logger.error('Failed to list manual answer embeddings', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

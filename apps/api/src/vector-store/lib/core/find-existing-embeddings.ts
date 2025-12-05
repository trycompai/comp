import { vectorIndex } from './client';
import { generateEmbedding } from './generate-embedding';
import { logger } from '../../logger';
import {
  type ExistingEmbedding,
  type SourceType,
  type QueryFilter,
  executeVectorQuery,
  addToResultsMap,
  fetchChunkContent,
  GENERIC_DOCUMENT_QUERIES,
  filterAndMapResults,
} from './query-helpers';

// Re-export types for backward compatibility
export type { ExistingEmbedding, SourceType };

/**
 * Finds existing embeddings for a specific policy, context, manual answer, or knowledge base document
 * Uses multiple query strategies to ensure we find ALL chunks
 */
export async function findEmbeddingsForSource(
  sourceId: string,
  sourceType: SourceType,
  organizationId: string,
  documentName?: string,
): Promise<ExistingEmbedding[]> {
  if (!vectorIndex || !sourceId || !organizationId) {
    return [];
  }

  const filter: QueryFilter = { organizationId, sourceType, sourceId };
  const allResults = new Map<string, ExistingEmbedding>();

  try {
    // Strategy 1-3: Basic queries (orgId, sourceId, combined)
    await runBasicQueryStrategies(filter, allResults);

    // Strategy 4: Query with documentName (for knowledge_base_document only)
    if (sourceType === 'knowledge_base_document' && documentName) {
      const results = await executeVectorQuery(
        documentName,
        filter,
        'documentName',
      );
      addToResultsMap(allResults, results);
    }

    // Strategy 5: Query with content from already-found chunks
    if (sourceType === 'knowledge_base_document' && allResults.size > 0) {
      await runChunkContentQueryStrategy(filter, allResults);
    }

    // Strategy 6: Query with generic terms (for knowledge_base_document)
    if (sourceType === 'knowledge_base_document') {
      await runGenericQueryStrategy(filter, allResults);
    }

    const matchingEmbeddings = Array.from(allResults.values());

    logger.info('Found embeddings for source', {
      sourceId,
      sourceType,
      organizationId,
      count: matchingEmbeddings.length,
    });

    return matchingEmbeddings;
  } catch (error) {
    logger.warn('Failed to find embeddings for source', {
      sourceId,
      sourceType,
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Run basic query strategies (organizationId, sourceId, combined)
 */
async function runBasicQueryStrategies(
  filter: QueryFilter,
  resultsMap: Map<string, ExistingEmbedding>,
): Promise<void> {
  const queries = [
    { text: filter.organizationId, strategyName: 'organizationId' },
    { text: filter.sourceId, strategyName: 'sourceId' },
    {
      text: `${filter.organizationId} ${filter.sourceId}`,
      strategyName: 'combined',
    },
  ];

  for (const { text, strategyName } of queries) {
    const results = await executeVectorQuery(text, filter, strategyName);
    addToResultsMap(resultsMap, results);
  }
}

/**
 * Query with content from already-found chunks to find more related chunks
 */
async function runChunkContentQueryStrategy(
  filter: QueryFilter,
  resultsMap: Map<string, ExistingEmbedding>,
): Promise<void> {
  const foundChunkIds = Array.from(resultsMap.keys()).slice(0, 3);

  for (const chunkId of foundChunkIds) {
    const chunkData = await fetchChunkContent(chunkId);
    if (!chunkData) continue;

    // Query with chunk content
    if (chunkData.content && chunkData.content.length > 50) {
      const contentQuery = chunkData.content.substring(0, 200);
      const results = await executeVectorQuery(
        contentQuery,
        filter,
        'chunkContent',
      );
      addToResultsMap(resultsMap, results);
    }

    // Query with filename from chunk metadata
    if (chunkData.documentName && chunkData.documentName.length > 0) {
      const results = await executeVectorQuery(
        chunkData.documentName,
        filter,
        'chunkFilename',
      );
      addToResultsMap(resultsMap, results);
    }
  }
}

/**
 * Query with generic terms that are likely to match document content
 */
async function runGenericQueryStrategy(
  filter: QueryFilter,
  resultsMap: Map<string, ExistingEmbedding>,
): Promise<void> {
  for (const genericQuery of GENERIC_DOCUMENT_QUERIES) {
    const results = await executeVectorQuery(genericQuery, filter, 'generic');
    addToResultsMap(resultsMap, results);
  }
}

/**
 * Finds all existing embeddings for an organization (for orphaned detection)
 * Uses pagination approach to respect Upstash Vector 1000 limit
 */
export async function findAllOrganizationEmbeddings(
  organizationId: string,
): Promise<Map<string, ExistingEmbedding[]>> {
  if (!vectorIndex) {
    logger.warn('Upstash Vector is not configured, returning empty map');
    return new Map();
  }

  if (!organizationId || organizationId.trim().length === 0) {
    return new Map();
  }

  try {
    const queryEmbedding = await generateEmbedding(organizationId);
    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: 100,
      includeMetadata: true,
    });

    // Filter by organizationId and valid source types
    const validSourceTypes = [
      'policy',
      'context',
      'manual_answer',
      'knowledge_base_document',
    ];
    const orgResults = results
      .filter((result) => {
        const metadata = result.metadata as Record<string, unknown> | undefined;
        return (
          metadata?.organizationId === organizationId &&
          validSourceTypes.includes(metadata?.sourceType as string)
        );
      })
      .map((result) => {
        const metadata = result.metadata as Record<string, unknown>;
        return {
          id: String(result.id),
          sourceId: (metadata?.sourceId as string) || '',
          sourceType: metadata?.sourceType as SourceType,
          updatedAt: metadata?.updatedAt as string | undefined,
        };
      });

    // Group by sourceId
    const groupedBySourceId = new Map<string, ExistingEmbedding[]>();

    for (const embedding of orgResults) {
      const existing = groupedBySourceId.get(embedding.sourceId) || [];
      existing.push(embedding);
      groupedBySourceId.set(embedding.sourceId, existing);
    }

    logger.info('Found existing embeddings for organization', {
      organizationId,
      totalEmbeddings: orgResults.length,
      uniqueSources: groupedBySourceId.size,
    });

    return groupedBySourceId;
  } catch (error) {
    logger.error('Failed to find existing embeddings', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Map();
  }
}

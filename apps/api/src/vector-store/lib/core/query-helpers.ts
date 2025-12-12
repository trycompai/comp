import { vectorIndex } from './client';
import { generateEmbedding } from './generate-embedding';
import { logger } from '../../logger';

export type SourceType =
  | 'policy'
  | 'context'
  | 'manual_answer'
  | 'knowledge_base_document';

export interface ExistingEmbedding {
  id: string;
  sourceId: string;
  sourceType: SourceType;
  updatedAt?: string;
}

export interface QueryFilter {
  organizationId: string;
  sourceType: SourceType;
  sourceId: string;
}

/**
 * Execute a vector query and filter results by metadata
 */
export async function executeVectorQuery(
  queryText: string,
  filter: QueryFilter,
  strategyName: string,
): Promise<ExistingEmbedding[]> {
  if (!vectorIndex) {
    return [];
  }

  try {
    const queryEmbedding = await generateEmbedding(queryText);
    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: 100,
      includeMetadata: true,
    });

    return filterAndMapResults(results, filter);
  } catch (error) {
    logger.warn(`Error in ${strategyName} query strategy`, {
      sourceId: filter.sourceId,
      sourceType: filter.sourceType,
      organizationId: filter.organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Filter vector query results by metadata and map to ExistingEmbedding
 */
export function filterAndMapResults(
  results: Array<{ id: string | number; metadata?: unknown }>,
  filter: QueryFilter,
): ExistingEmbedding[] {
  const filtered: ExistingEmbedding[] = [];

  for (const result of results) {
    const metadata = result.metadata as Record<string, unknown> | undefined;
    if (
      metadata?.organizationId === filter.organizationId &&
      metadata?.sourceType === filter.sourceType &&
      metadata?.sourceId === filter.sourceId
    ) {
      filtered.push({
        id: String(result.id),
        sourceId: metadata?.sourceId || '',
        sourceType: metadata?.sourceType as SourceType,
        updatedAt: metadata?.updatedAt as string | undefined,
      });
    }
  }

  return filtered;
}

/**
 * Add embeddings to a Map, avoiding duplicates
 */
export function addToResultsMap(
  resultsMap: Map<string, ExistingEmbedding>,
  embeddings: ExistingEmbedding[],
): void {
  for (const embedding of embeddings) {
    if (!resultsMap.has(embedding.id)) {
      resultsMap.set(embedding.id, embedding);
    }
  }
}

/**
 * Execute multiple vector queries in sequence and collect unique results
 */
export async function executeMultipleQueries(
  queries: Array<{ text: string; strategyName: string }>,
  filter: QueryFilter,
): Promise<Map<string, ExistingEmbedding>> {
  const allResults = new Map<string, ExistingEmbedding>();

  for (const { text, strategyName } of queries) {
    const results = await executeVectorQuery(text, filter, strategyName);
    addToResultsMap(allResults, results);
  }

  return allResults;
}

/**
 * Fetch chunk content by ID from vector index
 */
export async function fetchChunkContent(
  chunkId: string,
): Promise<{ content?: string; documentName?: string } | null> {
  if (!vectorIndex) {
    return null;
  }

  try {
    const chunkResult = await vectorIndex.fetch([chunkId]);
    if (chunkResult && chunkResult.length > 0 && chunkResult[0]) {
      const metadata = chunkResult[0].metadata as Record<string, unknown>;
      return {
        content: metadata?.content as string | undefined,
        documentName: metadata?.documentName as string | undefined,
      };
    }
    return null;
  } catch (error) {
    logger.warn('Error fetching chunk content', {
      chunkId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Generic queries for knowledge base documents
 */
export const GENERIC_DOCUMENT_QUERIES = [
  'document information content',
  'knowledge base document',
  'file content text',
];

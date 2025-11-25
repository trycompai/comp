import 'server-only';

import { vectorIndex } from './client';
import { generateEmbedding } from './generate-embedding';
import { logger } from '@/utils/logger';

export interface ExistingEmbedding {
  id: string;
  sourceId: string;
  sourceType: 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document';
  updatedAt?: string;
}

/**
 * Finds existing embeddings for a specific policy, context, manual answer, or knowledge base document
 * Uses multiple query strategies to ensure we find ALL chunks:
 * 1. Query with organizationId (finds org-wide embeddings)
 * 2. Query with sourceId (finds source-specific embeddings)
 * 3. Query with combined query (organizationId + sourceId)
 * 4. Query with documentName (for knowledge_base_document, finds chunks semantically similar to filename)
 * 5. Query with content from already-found chunks (uses both chunk content AND filename from metadata)
 * 6. Query with generic terms (for knowledge_base_document)
 * 
 * Note: We store `documentName` (filename) in metadata for all knowledge_base_document chunks.
 * This allows us to use the filename as a query vector to find related chunks.
 * 
 * This approach ensures we find all chunks even if org has >1000 total embeddings.
 */
export async function findEmbeddingsForSource(
  sourceId: string,
  sourceType: 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
  organizationId: string,
  documentName?: string, // Optional: for knowledge_base_document, helps find chunks semantically similar to filename
): Promise<ExistingEmbedding[]> {
  if (!vectorIndex) {
    return [];
  }

  if (!sourceId || !organizationId) {
    return [];
  }

  try {
    const allResults = new Map<string, ExistingEmbedding>();
    
    // Strategy 1: Query with organizationId
    try {
      const orgQueryEmbedding = await generateEmbedding(organizationId);
      const orgResults = await vectorIndex.query({
        vector: orgQueryEmbedding,
        topK: 100,
        includeMetadata: true,
      });

      for (const result of orgResults) {
        const metadata = result.metadata as any;
        if (
          metadata?.organizationId === organizationId &&
          metadata?.sourceType === sourceType &&
          metadata?.sourceId === sourceId
        ) {
          const id = String(result.id);
          if (!allResults.has(id)) {
            allResults.set(id, {
              id,
              sourceId: metadata?.sourceId || '',
              sourceType: metadata?.sourceType as 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
              updatedAt: metadata?.updatedAt,
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Error in organizationId query strategy', {
        sourceId,
        sourceType,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Strategy 2: Query with sourceId (more specific, likely to find document chunks)
    try {
      const sourceQueryEmbedding = await generateEmbedding(sourceId);
      const sourceResults = await vectorIndex.query({
        vector: sourceQueryEmbedding,
        topK: 100,
        includeMetadata: true,
      });

      for (const result of sourceResults) {
        const metadata = result.metadata as any;
        if (
          metadata?.organizationId === organizationId &&
          metadata?.sourceType === sourceType &&
          metadata?.sourceId === sourceId
        ) {
          const id = String(result.id);
          if (!allResults.has(id)) {
            allResults.set(id, {
              id,
              sourceId: metadata?.sourceId || '',
              sourceType: metadata?.sourceType as 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
              updatedAt: metadata?.updatedAt,
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Error in sourceId query strategy', {
        sourceId,
        sourceType,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Strategy 3: Query with combined query (organizationId + sourceId)
    // This helps find chunks that might be semantically closer to the combination
    try {
      const combinedQuery = `${organizationId} ${sourceId}`;
      const combinedQueryEmbedding = await generateEmbedding(combinedQuery);
      const combinedResults = await vectorIndex.query({
        vector: combinedQueryEmbedding,
        topK: 100,
        includeMetadata: true,
      });

      for (const result of combinedResults) {
        const metadata = result.metadata as any;
        if (
          metadata?.organizationId === organizationId &&
          metadata?.sourceType === sourceType &&
          metadata?.sourceId === sourceId
        ) {
          const id = String(result.id);
          if (!allResults.has(id)) {
            allResults.set(id, {
              id,
              sourceId: metadata?.sourceId || '',
              sourceType: metadata?.sourceType as 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
              updatedAt: metadata?.updatedAt,
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Error in combined query strategy', {
        sourceId,
        sourceType,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Strategy 4: Query with documentName (for knowledge_base_document only)
    // This helps find chunks that are semantically similar to the document filename
    if (sourceType === 'knowledge_base_document' && documentName) {
      try {
        const docNameQueryEmbedding = await generateEmbedding(documentName);
        const docNameResults = await vectorIndex.query({
          vector: docNameQueryEmbedding,
          topK: 100,
          includeMetadata: true,
        });

        for (const result of docNameResults) {
          const metadata = result.metadata as any;
          if (
            metadata?.organizationId === organizationId &&
            metadata?.sourceType === sourceType &&
            metadata?.sourceId === sourceId
          ) {
            const id = String(result.id);
            if (!allResults.has(id)) {
              allResults.set(id, {
                id,
                sourceId: metadata?.sourceId || '',
                sourceType: metadata?.sourceType as 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
                updatedAt: metadata?.updatedAt,
              });
            }
          }
        }
      } catch (error) {
        logger.warn('Error in documentName query strategy', {
          sourceId,
          sourceType,
          organizationId,
          documentName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Strategy 5: Query with content from already-found chunks (for knowledge_base_document)
    // This helps find chunks that are semantically similar to chunks we've already found
    // This is especially useful for finding the "last remaining" chunks
    if (sourceType === 'knowledge_base_document' && allResults.size > 0) {
      try {
        // Get a few chunks we've already found and use their content/metadata as query vectors
        const foundChunkIds = Array.from(allResults.keys()).slice(0, 3); // Use first 3 chunks
        
        // Query Upstash Vector to get the actual content/metadata of these chunks
        // Then use that content AND filename to find more chunks
        for (const chunkId of foundChunkIds) {
          try {
            // Fetch the chunk by ID to get its content and metadata
            const chunkResult = await vectorIndex.fetch([chunkId]);
            if (chunkResult && chunkResult.length > 0) {
              const chunk = chunkResult[0];
              if (!chunk) continue;
              const metadata = chunk.metadata as any;
              const chunkContent = metadata?.content as string;
              const chunkDocumentName = metadata?.documentName as string;
              
              // Strategy 5a: Query with chunk content
              if (chunkContent && chunkContent.length > 50) {
                // Use a portion of the chunk content as query (first 200 chars)
                const contentQuery = chunkContent.substring(0, 200);
                const contentQueryEmbedding = await generateEmbedding(contentQuery);
                const contentResults = await vectorIndex.query({
                  vector: contentQueryEmbedding,
                  topK: 100,
                  includeMetadata: true,
                });

                for (const result of contentResults) {
                  const resultMetadata = result.metadata as any;
                  if (
                    resultMetadata?.organizationId === organizationId &&
                    resultMetadata?.sourceType === sourceType &&
                    resultMetadata?.sourceId === sourceId
                  ) {
                    const id = String(result.id);
                    if (!allResults.has(id)) {
                      allResults.set(id, {
                        id,
                        sourceId: resultMetadata?.sourceId || '',
                        sourceType: resultMetadata?.sourceType as 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
                        updatedAt: resultMetadata?.updatedAt,
                      });
                    }
                  }
                }
              }

              // Strategy 5b: Query with filename from chunk metadata (if available)
              // This helps find chunks that might be semantically related to the filename
              if (chunkDocumentName && chunkDocumentName.length > 0) {
                const filenameQueryEmbedding = await generateEmbedding(chunkDocumentName);
                const filenameResults = await vectorIndex.query({
                  vector: filenameQueryEmbedding,
                  topK: 100,
                  includeMetadata: true,
                });

                for (const result of filenameResults) {
                  const resultMetadata = result.metadata as any;
                  if (
                    resultMetadata?.organizationId === organizationId &&
                    resultMetadata?.sourceType === sourceType &&
                    resultMetadata?.sourceId === sourceId
                  ) {
                    const id = String(result.id);
                    if (!allResults.has(id)) {
                      allResults.set(id, {
                        id,
                        sourceId: resultMetadata?.sourceId || '',
                        sourceType: resultMetadata?.sourceType as 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
                        updatedAt: resultMetadata?.updatedAt,
                      });
                    }
                  }
                }
              }
            }
          } catch (chunkError) {
            logger.warn('Error querying with chunk content/filename', {
              chunkId,
              error: chunkError instanceof Error ? chunkError.message : 'Unknown error',
            });
          }
        }
      } catch (error) {
        logger.warn('Error in chunk content/filename query strategy', {
          sourceId,
          sourceType,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Strategy 6: Query with generic terms (for knowledge_base_document)
    // Use generic terms that are likely to match document content
    if (sourceType === 'knowledge_base_document') {
      const genericQueries = [
        'document information content',
        'knowledge base document',
        'file content text',
      ];
      
      for (const genericQuery of genericQueries) {
        try {
          const genericQueryEmbedding = await generateEmbedding(genericQuery);
          const genericResults = await vectorIndex.query({
            vector: genericQueryEmbedding,
            topK: 100,
            includeMetadata: true,
          });

          for (const result of genericResults) {
            const metadata = result.metadata as any;
            if (
              metadata?.organizationId === organizationId &&
              metadata?.sourceType === sourceType &&
              metadata?.sourceId === sourceId
            ) {
              const id = String(result.id);
              if (!allResults.has(id)) {
                allResults.set(id, {
                  id,
                  sourceId: metadata?.sourceId || '',
                  sourceType: metadata?.sourceType as 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
                  updatedAt: metadata?.updatedAt,
                });
              }
            }
          }
        } catch (error) {
          logger.warn('Error in generic query strategy', {
            genericQuery,
            sourceId,
            sourceType,
            organizationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const matchingEmbeddings = Array.from(allResults.values());

    logger.info('Found embeddings for source', {
      sourceId,
      sourceType,
      organizationId,
      count: matchingEmbeddings.length,
      uniqueIds: matchingEmbeddings.map((e) => e.id),
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
 * Finds all existing embeddings for an organization (for orphaned detection)
 * Uses pagination approach to respect Upstash Vector 1000 limit
 * Only used for detecting orphaned embeddings that need deletion
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
    const allEmbeddings: ExistingEmbedding[] = [];
    
    // Use organizationId as query to find all embeddings for this org
    // This is more specific than generic queries
    const queryEmbedding = await generateEmbedding(organizationId);
    
    // Respect Upstash Vector limit of 1000
    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: 100, // Max allowed by Upstash Vector
      includeMetadata: true,
    });

    // Filter by organizationId and exclude questionnaire
    const orgResults = results
      .filter((result) => {
        const metadata = result.metadata as any;
        return (
          metadata?.organizationId === organizationId &&
          metadata?.sourceType !== 'questionnaire' &&
          (metadata?.sourceType === 'policy' || 
           metadata?.sourceType === 'context' || 
           metadata?.sourceType === 'manual_answer' ||
           metadata?.sourceType === 'knowledge_base_document')
        );
      })
      .map((result) => {
        const metadata = result.metadata as any;
        return {
          id: String(result.id),
          sourceId: metadata?.sourceId || '',
          sourceType: metadata?.sourceType as 'policy' | 'context' | 'manual_answer' | 'knowledge_base_document',
          updatedAt: metadata?.updatedAt,
        };
      });

    allEmbeddings.push(...orgResults);

    // Group by sourceId (policy/context ID)
    const groupedBySourceId = new Map<string, ExistingEmbedding[]>();
    
    for (const embedding of allEmbeddings) {
      const existing = groupedBySourceId.get(embedding.sourceId) || [];
      existing.push(embedding);
      groupedBySourceId.set(embedding.sourceId, existing);
    }

    logger.info('Found existing embeddings for organization', {
      organizationId,
      totalEmbeddings: allEmbeddings.length,
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


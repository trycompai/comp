import { vectorIndex } from './client';
import {
  generateEmbedding,
  batchGenerateEmbeddings,
} from './generate-embedding';
import { logger } from '../../logger';

export interface SimilarContentResult {
  id: string;
  score: number;
  content: string;
  sourceType:
    | 'policy'
    | 'context'
    | 'document_hub'
    | 'attachment'
    | 'manual_answer'
    | 'knowledge_base_document';
  sourceId: string;
  policyName?: string;
  contextQuestion?: string;
  documentName?: string;
  manualAnswerQuestion?: string;
}

// Minimum similarity threshold - results below this are considered noise
// Set to 0.2 for maximum recall while filtering obvious noise
const MIN_SIMILARITY_SCORE = 0.2;

// Maximum results to fetch from Upstash Vector (their limit is 1000, but 100 is practical)
const MAX_TOP_K = 100;

/**
 * Finds similar content using semantic search in Upstash Vector
 * Optimized for RAG (Retrieval-Augmented Generation) answer generation
 *
 * Returns ALL results above the similarity threshold - no artificial limit.
 * This ensures the LLM receives all potentially relevant organizational data.
 *
 * @param question - The question or query text to search for
 * @param organizationId - Filter results to this organization only
 * @returns Array of similar content results sorted by relevance score (highest first)
 */
export async function findSimilarContent(
  question: string,
  organizationId: string,
): Promise<SimilarContentResult[]> {
  if (!vectorIndex) {
    logger.warn('Upstash Vector is not configured, returning empty results');
    return [];
  }

  if (!question || question.trim().length === 0) {
    return [];
  }

  try {
    // Generate embedding for the question
    const queryEmbedding = await generateEmbedding(question);

    // Search in Upstash Vector with server-side organization filtering
    // Fetch maximum results, then filter by score threshold
    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: MAX_TOP_K,
      includeMetadata: true,
      filter: `organizationId = "${organizationId}"`,
    });

    // Filter by minimum similarity score only - no artificial limit
    // All relevant organizational data should reach the LLM
    const filteredResults: SimilarContentResult[] = results
      .filter((result) => result.score >= MIN_SIMILARITY_SCORE)
      .map((result): SimilarContentResult => {
        const metadata = result.metadata as any;
        return {
          id: String(result.id),
          score: result.score,
          content: metadata?.content || '',
          sourceType: (metadata?.sourceType ||
            'policy') as SimilarContentResult['sourceType'],
          sourceId: metadata?.sourceId || '',
          policyName: metadata?.policyName,
          contextQuestion: metadata?.contextQuestion,
          documentName: metadata?.documentName,
          manualAnswerQuestion: metadata?.manualAnswerQuestion,
        };
      });

    logger.info('Vector search completed', {
      question: question.substring(0, 100),
      organizationId,
      topK: MAX_TOP_K,
      totalResults: results.length,
      filteredResults: filteredResults.length,
      scoreRange:
        filteredResults.length > 0
          ? {
              min: filteredResults[filteredResults.length - 1]?.score,
              max: filteredResults[0]?.score,
            }
          : null,
    });

    return filteredResults;
  } catch (error) {
    logger.error('Failed to find similar content', {
      question: question.substring(0, 100),
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Batch version of findSimilarContent - processes multiple questions efficiently
 * Uses batch embedding generation (1 API call instead of N) for significant speedup
 *
 * For 116 questions:
 * - Regular: 116 embedding API calls (~8-12 seconds)
 * - Batch: 1 embedding API call (~1-2 seconds)
 *
 * @param questions - Array of questions to search for
 * @param organizationId - Filter results to this organization only
 * @returns Array of results arrays, one per question (same order as input)
 */
export async function findSimilarContentBatch(
  questions: string[],
  organizationId: string,
): Promise<SimilarContentResult[][]> {
  if (!vectorIndex) {
    logger.warn('Upstash Vector is not configured, returning empty results');
    return questions.map(() => []);
  }

  if (questions.length === 0) {
    return [];
  }

  const startTime = Date.now();

  try {
    // Step 1: Generate ALL embeddings in one batch API call (major time savings)
    logger.info('Generating batch embeddings', {
      questionCount: questions.length,
      organizationId,
    });

    const embeddingStartTime = Date.now();
    const embeddings = await batchGenerateEmbeddings(questions);
    const embeddingTime = Date.now() - embeddingStartTime;

    logger.info('Batch embeddings generated', {
      questionCount: questions.length,
      embeddingTimeMs: embeddingTime,
    });

    // Step 2: Query Upstash Vector in parallel for all questions
    const queryStartTime = Date.now();
    const queryResults = await Promise.all(
      embeddings.map(async (embedding, index) => {
        // Skip empty embeddings (from empty questions)
        if (!embedding || embedding.length === 0) {
          return { index, results: [] };
        }

        try {
          const results = await vectorIndex!.query({
            vector: embedding,
            topK: MAX_TOP_K,
            includeMetadata: true,
            filter: `organizationId = "${organizationId}"`,
          });
          return { index, results };
        } catch (error) {
          logger.warn('Query failed for question', {
            questionIndex: index,
            question: questions[index]?.substring(0, 50),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return { index, results: [] };
        }
      }),
    );
    const queryTime = Date.now() - queryStartTime;

    // Step 3: Filter and map results for each question
    const allFilteredResults: SimilarContentResult[][] = questions.map(
      () => [],
    );

    for (const { index, results } of queryResults) {
      const filtered = results
        .filter((result) => result.score >= MIN_SIMILARITY_SCORE)
        .map((result): SimilarContentResult => {
          const metadata = result.metadata as any;
          return {
            id: String(result.id),
            score: result.score,
            content: metadata?.content || '',
            sourceType: (metadata?.sourceType ||
              'policy') as SimilarContentResult['sourceType'],
            sourceId: metadata?.sourceId || '',
            policyName: metadata?.policyName,
            contextQuestion: metadata?.contextQuestion,
            documentName: metadata?.documentName,
            manualAnswerQuestion: metadata?.manualAnswerQuestion,
          };
        });

      allFilteredResults[index] = filtered;
    }

    const totalTime = Date.now() - startTime;

    logger.info('Batch vector search completed', {
      questionCount: questions.length,
      organizationId,
      embeddingTimeMs: embeddingTime,
      queryTimeMs: queryTime,
      totalTimeMs: totalTime,
      avgResultsPerQuestion:
        allFilteredResults.reduce((sum, r) => sum + r.length, 0) /
        questions.length,
    });

    return allFilteredResults;
  } catch (error) {
    logger.error('Failed to find similar content batch', {
      questionCount: questions.length,
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

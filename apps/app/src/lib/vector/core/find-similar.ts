import 'server-only';

import { vectorIndex } from './client';
import { generateEmbedding } from './generate-embedding';
import { logger } from '@/utils/logger';

export interface SimilarContentResult {
  id: string;
  score: number;
  content: string;
  sourceType: 'policy' | 'context' | 'document_hub' | 'attachment' | 'questionnaire' | 'manual_answer' | 'knowledge_base_document';
  sourceId: string;
  policyName?: string;
  contextQuestion?: string;
  vendorId?: string;
  vendorName?: string;
  questionnaireQuestion?: string;
  documentName?: string;
  manualAnswerQuestion?: string;
}

/**
 * Finds similar content using semantic search in Upstash Vector
 * @param question - The question or query text to search for
 * @param organizationId - Filter results to this organization only
 * @param limit - Maximum number of results to return (default: 5)
 * @returns Array of similar content results sorted by relevance score
 */
export async function findSimilarContent(
  question: string,
  organizationId: string,
  limit: number = 5,
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

    // Search in Upstash Vector
    // Note: Upstash Vector doesn't support metadata filtering in the query itself,
    // so we'll filter results after retrieval
    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: 100, // Get more results to account for filtering
      includeMetadata: true,
    });

    // Filter by organizationId and map to our result format
    // Also filter by minimum similarity score (cosine similarity typically ranges from -1 to 1, 
    // but Upstash Vector uses dot product which can vary, so we use a low threshold)
    const MIN_SIMILARITY_SCORE = 0.1; // Minimum threshold for relevance
    
    const filteredResults: SimilarContentResult[] = results
      .filter((result) => {
        const metadata = result.metadata as any;
        const hasCorrectOrg = metadata?.organizationId === organizationId;
        const hasMinScore = result.score >= MIN_SIMILARITY_SCORE;
        // Exclude questionnaire Q&A from results - we use Policy, Context, and Manual Answers as sources
        const isNotQuestionnaire = metadata?.sourceType !== 'questionnaire';
        return hasCorrectOrg && hasMinScore && isNotQuestionnaire;
      })
      .slice(0, limit) // Take only the top N after filtering
      .map((result): SimilarContentResult => {
        const metadata = result.metadata as any;
        return {
          id: String(result.id),
          score: result.score,
          content: metadata?.content || '',
          sourceType: (metadata?.sourceType || 'policy') as SimilarContentResult['sourceType'],
          sourceId: metadata?.sourceId || '',
          policyName: metadata?.policyName,
          contextQuestion: metadata?.contextQuestion,
          vendorId: metadata?.vendorId,
          vendorName: metadata?.vendorName,
          questionnaireQuestion: metadata?.questionnaireQuestion,
          documentName: metadata?.documentName,
          manualAnswerQuestion: metadata?.manualAnswerQuestion,
        };
      });

    logger.info('Vector search completed', {
      question: question.substring(0, 100),
      organizationId,
      totalResults: results.length,
      filteredResults: filteredResults.length,
      scores: filteredResults.map((r) => ({ id: r.id, score: r.score, sourceType: r.sourceType })),
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


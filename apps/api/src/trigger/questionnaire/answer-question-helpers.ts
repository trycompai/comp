import {
  findSimilarContent,
  findSimilarContentBatch,
} from '@/vector-store/lib';
import type { SimilarContentResult } from '@/vector-store/lib';
import { openai } from '@ai-sdk/openai';
import { logger } from '@trigger.dev/sdk';
import { generateText } from 'ai';
import {
  deduplicateSources,
  type Source,
} from '@/questionnaire/utils/deduplicate-sources';
import {
  ANSWER_MODEL,
  ANSWER_SYSTEM_PROMPT,
} from '@/questionnaire/utils/constants';

export interface AnswerWithSources {
  answer: string | null;
  sources: Array<{
    sourceType: string;
    sourceName?: string;
    score: number;
  }>;
}

/**
 * Extracts source information from similar content results and deduplicates them
 */
function extractAndDeduplicateSources(
  similarContent: SimilarContentResult[],
): Source[] {
  const sourcesBeforeDedup = similarContent.map((result) => {
    const r = result;
    let sourceName: string | undefined;

    if (r.policyName) {
      sourceName = `Policy: ${r.policyName}`;
    } else if (r.contextQuestion) {
      sourceName = 'Context Q&A';
    } else if (r.sourceType === 'manual_answer') {
      // Don't set sourceName here - let deduplicateSources handle it with manualAnswerQuestion
      sourceName = undefined;
    }
    // Don't set sourceName for knowledge_base_document - let deduplication function handle it with filename

    return {
      sourceType: r.sourceType,
      sourceName,
      sourceId: r.sourceId,
      policyName: r.policyName,
      documentName: r.documentName,
      manualAnswerQuestion: r.manualAnswerQuestion,
      score: r.score,
    };
  });

  return deduplicateSources(sourcesBeforeDedup);
}

/**
 * Builds context string from similar content for LLM prompt
 */
function buildContextFromContent(
  similarContent: SimilarContentResult[],
): string {
  const contextParts = similarContent.map((result, index) => {
    const r = result;
    let sourceInfo = '';

    if (r.policyName) {
      sourceInfo = `Source: Policy "${r.policyName}"`;
    } else if (r.contextQuestion) {
      sourceInfo = `Source: Context Q&A`;
    } else if (r.sourceType === 'knowledge_base_document') {
      sourceInfo = r.documentName
        ? `Source: Knowledge Base Document "${r.documentName}"`
        : `Source: Knowledge Base Document`;
    } else if (r.sourceType === 'manual_answer') {
      sourceInfo = `Source: Manual Answer`;
    } else {
      sourceInfo = `Source: ${r.sourceType}`;
    }

    return `[${index + 1}] ${sourceInfo}\n${r.content}`;
  });

  return contextParts.join('\n\n');
}

/**
 * Generates answer using LLM with the provided context
 */
async function generateAnswerWithLLM(
  question: string,
  context: string,
): Promise<string> {
  const { text } = await generateText({
    model: openai(ANSWER_MODEL),
    system: ANSWER_SYSTEM_PROMPT,
    prompt: `Based on the following context from our organization's policies and documentation, answer this question:

Question: ${question}

Context:
${context}

Answer the question based ONLY on the provided context, using first person plural (we, our, us). If the context doesn't contain enough information, respond with exactly "N/A - no evidence found".`,
  });

  return text.trim();
}

/**
 * Checks if an answer indicates no evidence was found
 */
function isNoEvidenceAnswer(answer: string): boolean {
  const lowerAnswer = answer.toLowerCase();
  return (
    lowerAnswer.includes('n/a') ||
    lowerAnswer.includes('no evidence') ||
    lowerAnswer.includes('not found in the context')
  );
}

/**
 * Generates an answer for a question using RAG (Retrieval-Augmented Generation)
 */
export async function generateAnswerWithRAG(
  question: string,
  organizationId: string,
): Promise<AnswerWithSources> {
  try {
    // Find similar content from vector database
    const similarContent = await findSimilarContent(question, organizationId);

    logger.info('Vector search results', {
      question: question.substring(0, 100),
      organizationId,
      resultCount: similarContent.length,
      results: similarContent.map((r) => ({
        sourceType: r.sourceType,
        score: r.score,
        sourceId: r.sourceId.substring(0, 50),
      })),
    });

    // If no relevant content found, return null
    if (similarContent.length === 0) {
      logger.warn('No similar content found in vector database', {
        question: question.substring(0, 100),
        organizationId,
      });
      return { answer: null, sources: [] };
    }

    // Extract and deduplicate sources
    const sources = extractAndDeduplicateSources(similarContent);

    logger.info('Sources extracted and deduplicated', {
      question: question.substring(0, 100),
      organizationId,
      similarContentCount: similarContent.length,
      sourcesAfterDedupCount: sources.length,
      sources: sources.map((s) => ({
        type: s.sourceType,
        name: s.sourceName,
        score: s.score,
        sourceId: s.sourceId?.substring(0, 30),
      })),
    });

    // Build context and generate answer
    const context = buildContextFromContent(similarContent);
    const answer = await generateAnswerWithLLM(question, context);

    // Check if the answer indicates no evidence
    if (isNoEvidenceAnswer(answer)) {
      logger.warn('Answer indicates no evidence found', {
        question: question.substring(0, 100),
        answer: answer.substring(0, 100),
        sourcesCount: sources.length,
      });
      return { answer: null, sources: [] };
    }

    // Safety check: if we have an answer but no sources, log a warning
    if (sources.length === 0 && answer) {
      logger.warn(
        'Answer generated but no sources found - this may indicate LLM used general knowledge',
        {
          question: question.substring(0, 100),
          answer: answer.substring(0, 100),
          similarContentCount: similarContent.length,
        },
      );
    }

    return { answer, sources };
  } catch (error) {
    logger.error('Failed to generate answer with RAG', {
      question: question.substring(0, 100),
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { answer: null, sources: [] };
  }
}

/**
 * Batch version of generateAnswerWithRAG - processes multiple questions efficiently
 * Uses batch embedding generation for significant speedup
 */
export async function generateAnswerWithRAGBatch(
  questions: string[],
  organizationId: string,
): Promise<AnswerWithSources[]> {
  if (questions.length === 0) {
    return [];
  }

  const startTime = Date.now();

  try {
    logger.info('Starting batch RAG generation', {
      questionCount: questions.length,
      organizationId,
    });

    // Step 1: Find similar content for ALL questions at once (batch embeddings)
    const searchStartTime = Date.now();
    const allSimilarContent = await findSimilarContentBatch(
      questions,
      organizationId,
    );
    const searchTime = Date.now() - searchStartTime;

    logger.info('Batch search completed', {
      questionCount: questions.length,
      searchTimeMs: searchTime,
    });

    // Step 2: Generate answers in parallel using pre-fetched content
    const llmStartTime = Date.now();
    const answers = await Promise.all(
      questions.map((question, index) =>
        generateAnswerFromContent(question, allSimilarContent[index] || []),
      ),
    );
    const llmTime = Date.now() - llmStartTime;

    const totalTime = Date.now() - startTime;

    logger.info('Batch RAG generation completed', {
      questionCount: questions.length,
      searchTimeMs: searchTime,
      llmTimeMs: llmTime,
      totalTimeMs: totalTime,
      answeredCount: answers.filter((a) => a.answer !== null).length,
    });

    return answers;
  } catch (error) {
    logger.error('Failed batch RAG generation', {
      questionCount: questions.length,
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Return empty results for all questions on failure
    return questions.map(() => ({ answer: null, sources: [] }));
  }
}

/**
 * Helper function to generate an answer from pre-fetched similar content
 * Used by both single and batch answer generation
 * Exported for use in streaming endpoints that do batch search + parallel LLM
 */
export async function generateAnswerFromContent(
  question: string,
  similarContent: SimilarContentResult[],
): Promise<AnswerWithSources> {
  try {
    // If no relevant content found, return null
    if (similarContent.length === 0) {
      return { answer: null, sources: [] };
    }

    // Extract and deduplicate sources
    const sources = extractAndDeduplicateSources(similarContent);

    // Build context and generate answer
    const context = buildContextFromContent(similarContent);
    const answer = await generateAnswerWithLLM(question, context);

    // Check if the answer indicates no evidence
    if (isNoEvidenceAnswer(answer)) {
      return { answer: null, sources: [] };
    }

    return { answer, sources };
  } catch (error) {
    logger.error('Failed to generate answer from content', {
      question: question.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { answer: null, sources: [] };
  }
}

import {
  findSimilarContent,
  findSimilarContentBatch,
} from '@/vector-store/lib';
import type { SimilarContentResult } from '@/vector-store/lib';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
  deduplicateSources,
  type Source,
} from '@/questionnaire/utils/deduplicate-sources';
import {
  SOA_RAG_MODEL,
  SOA_BATCH_MODEL,
  SOA_RAG_SYSTEM_PROMPT,
  SOA_BATCH_SYSTEM_PROMPT,
  buildSOAQuestionPrompt,
  isInsufficientDataAnswer,
} from './constants';

export interface SOAAnswerWithSources {
  answer: string | null;
  sources: Source[];
}

export interface SOAAnswerLogger {
  log: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

const defaultLogger: SOAAnswerLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
};

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
      sourceName = undefined;
    }

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
 * Generates a SOA answer using RAG (Retrieval-Augmented Generation)
 * Performs vector search and LLM generation
 */
export async function generateSOAAnswerWithRAG(
  question: string,
  organizationId: string,
  logger: SOAAnswerLogger = defaultLogger,
): Promise<SOAAnswerWithSources> {
  try {
    // Find similar content from vector database
    const similarContent = await findSimilarContent(question, organizationId);

    logger.log('Vector search results for SOA', {
      question: question.substring(0, 100),
      organizationId,
      resultCount: similarContent.length,
    });

    // If no relevant content found, return null
    if (similarContent.length === 0) {
      logger.warn('No similar content found in vector database for SOA', {
        question: question.substring(0, 100),
        organizationId,
      });
      return { answer: null, sources: [] };
    }

    return generateSOAAnswerFromContent(question, similarContent);
  } catch (error) {
    logger.error('Failed to generate SOA answer with RAG', {
      question: question.substring(0, 100),
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return { answer: null, sources: [] };
  }
}

/**
 * Generates a SOA answer from pre-fetched similar content
 * Used for batch processing - skips individual vector search
 */
export async function generateSOAAnswerFromContent(
  question: string,
  similarContent: SimilarContentResult[],
): Promise<SOAAnswerWithSources> {
  // If no relevant content found, return null
  if (similarContent.length === 0) {
    return { answer: null, sources: [] };
  }

  // Extract and deduplicate sources
  const sources = extractAndDeduplicateSources(similarContent);

  // Build context from retrieved content
  const context = buildContextFromContent(similarContent);

  // Generate answer using LLM with ISO 27001 compliance analysis prompt
  const { text } = await generateText({
    model: openai(SOA_RAG_MODEL),
    system: SOA_RAG_SYSTEM_PROMPT,
    prompt: `Based EXCLUSIVELY on the following context from our organization's policies and documentation, answer this question:

Question: ${question}

Context:
${context}

IMPORTANT: Answer the question based ONLY on the provided context above. DO NOT use any general knowledge or assumptions. If the context does not contain enough information to answer the question, respond with exactly "INSUFFICIENT_DATA". Use first person plural (we, our, us) when answering.`,
  });

  const trimmedAnswer = text.trim();

  // Check if the answer indicates insufficient data
  if (isInsufficientDataAnswer(trimmedAnswer)) {
    // Try to parse as JSON to check isApplicable field
    try {
      const parsed = JSON.parse(trimmedAnswer);
      if (
        parsed.isApplicable === 'INSUFFICIENT_DATA' ||
        parsed.isApplicable?.toUpperCase()?.includes('INSUFFICIENT')
      ) {
        return { answer: null, sources };
      }
    } catch {
      return { answer: null, sources };
    }
  }

  return { answer: trimmedAnswer, sources };
}

/**
 * Generates SOA answer from pre-fetched content for a specific control question
 * Used for batch processing with pre-built question prompts
 */
export async function generateSOAControlAnswer(
  question: {
    id: string;
    text: string;
    columnMapping: {
      closure: string;
      title: string;
      control_objective: string | null;
    };
  },
  similarContent: SimilarContentResult[],
): Promise<SOAAnswerWithSources> {
  // If no relevant content found, return null
  if (similarContent.length === 0) {
    return { answer: null, sources: [] };
  }

  // Extract and deduplicate sources
  const sources = extractAndDeduplicateSources(similarContent);

  // Build context from retrieved content
  const context = buildContextFromContent(similarContent);

  // Build the SOA question prompt
  const soaQuestion = buildSOAQuestionPrompt(
    question.columnMapping.title,
    question.text,
  );

  // Generate answer using LLM
  const { text } = await generateText({
    model: openai(SOA_BATCH_MODEL),
    system: SOA_BATCH_SYSTEM_PROMPT,
    prompt: `Based on the following context from our organization's policies and documentation, analyze this SOA question:

Question: ${soaQuestion}

Context:
${context}

Provide your analysis in the exact JSON format specified. If the context doesn't contain sufficient information, respond with "INSUFFICIENT_DATA".`,
  });

  return { answer: text.trim(), sources };
}

/**
 * Batch fetch similar content for all SOA questions
 * Uses batch embedding generation for significant speedup
 */
export async function batchSearchSOAQuestions(
  questions: Array<{
    id: string;
    text: string;
    columnMapping: {
      closure: string;
      title: string;
      control_objective: string | null;
    };
  }>,
  organizationId: string,
): Promise<Map<string, SimilarContentResult[]>> {
  // Build the SOA question texts
  const questionTexts = questions.map((question) =>
    buildSOAQuestionPrompt(question.columnMapping.title, question.text),
  );

  // Batch search all questions
  const allSimilarContent = await findSimilarContentBatch(
    questionTexts,
    organizationId,
  );

  // Create map by question ID
  const contentMap = new Map<string, SimilarContentResult[]>();
  questions.forEach((question, index) => {
    contentMap.set(question.id, allSimilarContent[index] || []);
  });

  return contentMap;
}

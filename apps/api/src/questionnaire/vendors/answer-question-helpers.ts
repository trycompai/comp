import { findSimilarContent } from '@/vector-store/lib';
import type { SimilarContentResult } from '@/vector-store/lib';
import { openai } from '@ai-sdk/openai';
import { logger } from '@trigger.dev/sdk';
import { generateText } from 'ai';
import { deduplicateSources } from '@/questionnaire/utils/deduplicate-sources';

export interface AnswerWithSources {
  answer: string | null;
  sources: Array<{
    sourceType: string;
    sourceName?: string;
    score: number;
  }>;
}

/**
 * Generates an answer for a question using RAG (Retrieval-Augmented Generation)
 * This is extracted from vendor-questionnaire-orchestrator.ts to be used in Trigger.dev tasks
 */
export async function generateAnswerWithRAG(
  question: string,
  organizationId: string,
): Promise<AnswerWithSources> {
  try {
    // Find similar content from vector database
    const similarContent = await findSimilarContent(question, organizationId, 5) as SimilarContentResult[];

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

    // Extract sources information and deduplicate using universal utility
    // Multiple chunks from the same source (same policy/context/manual answer/knowledge base document) should appear as a single source
    // Note: sourceName is set for some types, but knowledge_base_document will be handled by deduplication function
    const sourcesBeforeDedup = similarContent.map((result) => {
      // Use any to avoid TypeScript narrowing issues, then assert correct type
      const r = result as any as SimilarContentResult;
      let sourceName: string | undefined;
      if (r.policyName) {
        sourceName = `Policy: ${r.policyName}`;
      } else if (r.vendorName && r.questionnaireQuestion) {
        sourceName = `Questionnaire: ${r.vendorName}`;
      } else if (r.contextQuestion) {
        sourceName = 'Context Q&A';
      } else if ((r.sourceType as string) === 'manual_answer') {
        // Don't set sourceName here - let deduplicateSources handle it with manualAnswerQuestion
        // This ensures we show the question preview if available
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

    const sources = deduplicateSources(sourcesBeforeDedup);

    logger.info('Sources extracted and deduplicated', {
      question: question.substring(0, 100),
      organizationId,
      similarContentCount: similarContent.length,
      sourcesBeforeDedupCount: sourcesBeforeDedup.length,
      sourcesAfterDedupCount: sources.length,
      sources: sources.map((s) => ({
        type: s.sourceType,
        name: s.sourceName,
        score: s.score,
        sourceId: s.sourceId?.substring(0, 30),
      })),
    });

    // Build context from retrieved content
    const contextParts = similarContent.map((result, index) => {
      // Use any to avoid TypeScript narrowing issues, then assert correct type
      const r = result as any as SimilarContentResult;
      let sourceInfo = '';
      if (r.policyName) {
        sourceInfo = `Source: Policy "${r.policyName}"`;
      } else if (r.vendorName && r.questionnaireQuestion) {
        sourceInfo = `Source: Questionnaire from "${r.vendorName}"`;
      } else if (r.contextQuestion) {
        sourceInfo = `Source: Context Q&A`;
      } else if ((r.sourceType as string) === 'knowledge_base_document') {
        const docName = r.documentName;
        if (docName) {
          sourceInfo = `Source: Knowledge Base Document "${docName}"`;
        } else {
          sourceInfo = `Source: Knowledge Base Document`;
        }
      } else if ((r.sourceType as string) === 'manual_answer') {
        sourceInfo = `Source: Manual Answer`;
      } else {
        sourceInfo = `Source: ${r.sourceType}`;
      }

      return `[${index + 1}] ${sourceInfo}\n${r.content}`;
    });

    const context = contextParts.join('\n\n');

    // Generate answer using LLM with RAG
    const { text } = await generateText({
      model: openai('gpt-5-mini'), // Faster model for answer generation
      system: `You are an expert at answering security and compliance questions for vendor questionnaires.

Your task is to answer questions based ONLY on the provided context from the organization's policies and documentation.

CRITICAL RULES:
1. Answer based ONLY on the provided context. Do not make up facts or use general knowledge.
2. If the context does not contain enough information to answer the question, respond with exactly: "N/A - no evidence found"
3. BE CONCISE. Give SHORT, direct answers. Do NOT provide detailed explanations or elaborate unnecessarily.
4. Use enterprise-ready language appropriate for vendor questionnaires.
5. If multiple sources provide information, synthesize them into ONE concise answer.
6. Do not include disclaimers or notes about the source unless specifically relevant.
7. Format your answer as a clear, professional response suitable for a vendor questionnaire.
8. Always write in first person plural (we, our, us) as if speaking on behalf of the organization.
9. Keep answers to 1-3 sentences maximum unless the question explicitly requires more detail.`,
      prompt: `Based on the following context from our organization's policies and documentation, answer this question:

Question: ${question}

Context:
${context}

Answer the question based ONLY on the provided context, using first person plural (we, our, us). If the context doesn't contain enough information, respond with exactly "N/A - no evidence found".`,
    });

    // Check if the answer indicates no evidence
    const trimmedAnswer = text.trim();
    if (
      trimmedAnswer.toLowerCase().includes('n/a') ||
      trimmedAnswer.toLowerCase().includes('no evidence') ||
      trimmedAnswer.toLowerCase().includes('not found in the context')
    ) {
      logger.warn('Answer indicates no evidence found', {
        question: question.substring(0, 100),
        answer: trimmedAnswer.substring(0, 100),
        sourcesCount: sources.length,
      });
      return { answer: null, sources: [] };
    }

    // Safety check: if we have an answer but no sources, log a warning
    // This shouldn't happen if LLM follows instructions, but we log it for debugging
    if (sources.length === 0 && trimmedAnswer) {
      logger.warn('Answer generated but no sources found - this may indicate LLM used general knowledge', {
        question: question.substring(0, 100),
        answer: trimmedAnswer.substring(0, 100),
        similarContentCount: similarContent.length,
        sourcesBeforeDedupCount: sourcesBeforeDedup.length,
      });
      // Still return the answer, but without sources
    }

    return { answer: trimmedAnswer, sources };
  } catch (error) {
    logger.error('Failed to generate answer with RAG', {
      question: question.substring(0, 100),
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { answer: null, sources: [] };
  }
}

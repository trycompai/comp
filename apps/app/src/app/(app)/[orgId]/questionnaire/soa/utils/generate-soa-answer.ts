import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { findSimilarContent } from '@/lib/vector';
import { logger } from '@/utils/logger';
import type { SimilarContentResult } from '@/lib/vector';
import { deduplicateSources } from '@/app/(app)/[orgId]/questionnaire/utils/deduplicate-sources';

export interface SOAAnswerWithSources {
  answer: string | null;
  sources: Array<{
    sourceType: string;
    sourceName?: string;
    sourceId?: string;
    policyName?: string;
    documentName?: string;
    score: number;
  }>;
}

/**
 * Generates an answer for SOA questions using RAG with ISO 27001 compliance analysis prompt
 */
export async function generateSOAAnswerWithRAG(
  question: string,
  organizationId: string,
): Promise<SOAAnswerWithSources> {
  try {
    // Find similar content from vector database
    const similarContent = await findSimilarContent(question, organizationId, 5) as SimilarContentResult[];

    logger.info('Vector search results for SOA', {
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
      logger.warn('No similar content found in vector database for SOA', {
        question: question.substring(0, 100),
        organizationId,
      });
      return { answer: null, sources: [] };
    }

    // Extract sources information and deduplicate using universal utility
    const sourcesBeforeDedup = similarContent.map((result) => {
      const r = result as any as SimilarContentResult;
      let sourceName: string | undefined;
      if (r.policyName) {
        sourceName = `Policy: ${r.policyName}`;
      } else if (r.vendorName && r.questionnaireQuestion) {
        sourceName = `Questionnaire: ${r.vendorName}`;
      } else if (r.contextQuestion) {
        sourceName = 'Context Q&A';
      } else if ((r.sourceType as string) === 'manual_answer') {
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

    const sources = deduplicateSources(sourcesBeforeDedup);

    // Build context from retrieved content
    const contextParts = similarContent.map((result, index) => {
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

    // Generate answer using LLM with ISO 27001 compliance analysis prompt
    const { text } = await generateText({
      model: openai('gpt-5-mini'),
      system: `You are an expert organizational analyst conducting a comprehensive assessment of a company for ISO 27001 compliance.

Your task is to analyze the provided context entries and create a structured organizational profile.

ANALYSIS FRAMEWORK:

Extract and categorize information about the organization across these dimensions:
- Business type and industry
- Operational scope and scale
- Risk profile and risk management approach
- Regulatory requirements and compliance posture
- Technical infrastructure and security controls
- Organizational policies and procedures
- Governance structure

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:
1. Answer based EXCLUSIVELY on the provided context from the organization's policies and documentation.
2. DO NOT use general knowledge, assumptions, or information not present in the context.
3. DO NOT hallucinate or invent facts that are not explicitly stated in the context.
4. If the context does not contain enough information to answer the question, respond with exactly: "INSUFFICIENT_DATA"
5. For applicability questions, respond with ONLY "YES" or "NO" - no additional explanation.
6. For justification questions, provide clear, professional explanations (2 sentences) based ONLY on the context provided.
7. Use enterprise-ready language appropriate for ISO 27001 compliance documentation.
8. Always write in first person plural (we, our, us) as if speaking on behalf of the organization.
9. Be precise and factual - base conclusions strictly on the provided evidence.
10. If you cannot find relevant information in the context to answer the question, you MUST respond with "INSUFFICIENT_DATA".`,
      prompt: `Based EXCLUSIVELY on the following context from our organization's policies and documentation, answer this question:

Question: ${question}

Context:
${context}

IMPORTANT: Answer the question based ONLY on the provided context above. DO NOT use any general knowledge or assumptions. If the context does not contain enough information to answer the question, respond with exactly "INSUFFICIENT_DATA". Use first person plural (we, our, us) when answering.`,
    });

    const trimmedAnswer = text.trim();
    
    // Check if the answer indicates insufficient data (check both JSON and text formats)
    const upperAnswer = trimmedAnswer.toUpperCase();
    if (
      upperAnswer.includes('INSUFFICIENT_DATA') ||
      upperAnswer.includes('N/A') ||
      upperAnswer.includes('NO EVIDENCE FOUND') ||
      upperAnswer.includes('NOT ENOUGH INFORMATION') ||
      upperAnswer.includes('INSUFFICIENT') ||
      upperAnswer.includes('NOT FOUND IN THE CONTEXT') ||
      upperAnswer.includes('NO INFORMATION AVAILABLE')
    ) {
      // Check if it's a JSON response with INSUFFICIENT_DATA
      try {
        const parsed = JSON.parse(trimmedAnswer);
        const isApplicableUpper = parsed.isApplicable?.toUpperCase();
        if (parsed.isApplicable === 'INSUFFICIENT_DATA' || (isApplicableUpper && isApplicableUpper.includes('INSUFFICIENT'))) {
          logger.info('SOA answer indicates insufficient data (JSON format)', {
            question: question.substring(0, 100),
            answer: trimmedAnswer,
            sourcesCount: sources.length,
          });
          return {
            answer: null,
            sources,
          };
        }
      } catch {
        // Not JSON, check as text
        logger.info('SOA answer indicates insufficient data (text format)', {
          question: question.substring(0, 100),
          answer: trimmedAnswer,
          sourcesCount: sources.length,
        });
        return {
          answer: null,
          sources,
        };
      }
    }

    // Return the answer as-is (preserve JSON format if present)
    return {
      answer: trimmedAnswer,
      sources,
    };
  } catch (error) {
    logger.error('Failed to generate SOA answer with RAG', {
      question: question.substring(0, 100),
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      answer: null,
      sources: [],
    };
  }
}


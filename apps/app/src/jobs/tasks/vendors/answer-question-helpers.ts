import { findSimilarContent } from "@/lib/vector";
import { openai } from "@ai-sdk/openai";
import { logger } from "@trigger.dev/sdk";
import { generateText } from "ai";

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
    const similarContent = await findSimilarContent(
      question,
      organizationId,
      5,
    );

    logger.info("Vector search results", {
      question: question.substring(0, 100),
      organizationId,
      resultCount: similarContent.length,
      results: similarContent.map((r) => ({
        sourceType: r.sourceType,
        score: r.score,
        sourceId: r.sourceId.substring(0, 50),
      })),
    });

    // Extract sources information and deduplicate by sourceName
    // Multiple chunks from the same source (same policy/context) should appear as a single source
    const sourceMap = new Map<
      string,
      {
        sourceType: string;
        sourceName?: string;
        sourceId: string;
        policyName?: string;
        score: number;
      }
    >();

    for (const result of similarContent) {
      // Generate sourceName first to use as deduplication key
      let sourceName: string | undefined;
      if (result.policyName) {
        sourceName = `Policy: ${result.policyName}`;
      } else if (result.vendorName && result.questionnaireQuestion) {
        sourceName = `Questionnaire: ${result.vendorName}`;
      } else if (result.contextQuestion) {
        sourceName = "Context Q&A";
      }

      // Use sourceName as the unique key to prevent duplicates
      // For policies: same policy name = same source
      // For context: all context entries = single "Context Q&A" source
      const key = sourceName || result.sourceId;

      // If we haven't seen this source, or this chunk has a higher score, use it
      const existing = sourceMap.get(key);
      if (!existing || result.score > existing.score) {
        sourceMap.set(key, {
          sourceType: result.sourceType,
          sourceName,
          sourceId: result.sourceId,
          policyName: result.policyName,
          score: result.score,
        });
      }
    }

    // Convert map to array and sort by score (highest first)
    const sources = Array.from(sourceMap.values()).sort(
      (a, b) => b.score - a.score,
    );

    // If no relevant content found, return null
    if (similarContent.length === 0) {
      logger.warn("No similar content found in vector database", {
        question: question.substring(0, 100),
        organizationId,
      });
      return { answer: null, sources: [] };
    }

    // Build context from retrieved content
    const contextParts = similarContent.map((result, index) => {
      let sourceInfo = "";
      if (result.policyName) {
        sourceInfo = `Source: Policy "${result.policyName}"`;
      } else if (result.vendorName && result.questionnaireQuestion) {
        sourceInfo = `Source: Questionnaire from "${result.vendorName}"`;
      } else if (result.contextQuestion) {
        sourceInfo = `Source: Context Q&A`;
      } else {
        sourceInfo = `Source: ${result.sourceType}`;
      }

      return `[${index + 1}] ${sourceInfo}\n${result.content}`;
    });

    const context = contextParts.join("\n\n");

    // Generate answer using LLM with RAG
    const { text } = await generateText({
      model: openai("gpt-5-mini"), // Faster model for answer generation
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
      trimmedAnswer.toLowerCase().includes("n/a") ||
      trimmedAnswer.toLowerCase().includes("no evidence") ||
      trimmedAnswer.toLowerCase().includes("not found in the context")
    ) {
      return { answer: null, sources: [] };
    }

    return { answer: trimmedAnswer, sources };
  } catch (error) {
    logger.error("Failed to generate answer with RAG", {
      question: question.substring(0, 100),
      organizationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { answer: null, sources: [] };
  }
}

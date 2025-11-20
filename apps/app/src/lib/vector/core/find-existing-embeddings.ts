import "server-only";

import { logger } from "@/utils/logger";

import { vectorIndex } from "./client";
import { generateEmbedding } from "./generate-embedding";

export interface ExistingEmbedding {
  id: string;
  sourceId: string;
  sourceType: "policy" | "context";
  updatedAt?: string;
}

/**
 * Finds existing embeddings for a specific policy or context
 * On-demand approach: checks only what we need, avoids Upstash Vector 1000 limit
 * More efficient and performant than fetching all embeddings upfront
 */
export async function findEmbeddingsForSource(
  sourceId: string,
  sourceType: "policy" | "context",
  organizationId: string,
): Promise<ExistingEmbedding[]> {
  if (!vectorIndex) {
    return [];
  }

  if (!sourceId || !organizationId) {
    return [];
  }

  try {
    // Create a specific query that will match this source
    // Using sourceId in the query helps find exact matches
    const queryText =
      sourceType === "policy"
        ? `policy ${sourceId} security compliance`
        : `context ${sourceId} question answer`;

    const queryEmbedding = await generateEmbedding(queryText);

    // Use smaller topK since we're looking for specific source
    // Upstash Vector limit is 1000, but we only need a few results
    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: 100, // Small number - we're looking for specific source
      includeMetadata: true,
    });

    // Filter by exact sourceId match and organizationId
    const matchingEmbeddings = results
      .filter((result) => {
        const metadata = result.metadata as any;
        return (
          metadata?.organizationId === organizationId &&
          metadata?.sourceType === sourceType &&
          metadata?.sourceId === sourceId
        );
      })
      .map((result) => {
        const metadata = result.metadata as any;
        return {
          id: String(result.id),
          sourceId: metadata?.sourceId || "",
          sourceType: metadata?.sourceType as "policy" | "context",
          updatedAt: metadata?.updatedAt,
        };
      });

    return matchingEmbeddings;
  } catch (error) {
    logger.warn("Failed to find embeddings for source", {
      sourceId,
      sourceType,
      organizationId,
      error: error instanceof Error ? error.message : "Unknown error",
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
    logger.warn("Upstash Vector is not configured, returning empty map");
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
      topK: 1000, // Max allowed by Upstash Vector
      includeMetadata: true,
    });

    // Filter by organizationId and exclude questionnaire
    const orgResults = results
      .filter((result) => {
        const metadata = result.metadata as any;
        return (
          metadata?.organizationId === organizationId &&
          metadata?.sourceType !== "questionnaire" &&
          (metadata?.sourceType === "policy" ||
            metadata?.sourceType === "context")
        );
      })
      .map((result) => {
        const metadata = result.metadata as any;
        return {
          id: String(result.id),
          sourceId: metadata?.sourceId || "",
          sourceType: metadata?.sourceType as "policy" | "context",
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

    logger.info("Found existing embeddings for organization", {
      organizationId,
      totalEmbeddings: allEmbeddings.length,
      uniqueSources: groupedBySourceId.size,
    });

    return groupedBySourceId;
  } catch (error) {
    logger.error("Failed to find existing embeddings", {
      organizationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new Map();
  }
}

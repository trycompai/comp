// Core functionality
export { vectorIndex } from "./core/client";
export { generateEmbedding } from "./core/generate-embedding";
export {
  findSimilarContent,
  type SimilarContentResult,
} from "./core/find-similar";
export {
  upsertEmbedding,
  batchUpsertEmbeddings,
  type EmbeddingMetadata,
  type SourceType,
} from "./core/upsert-embedding";
export { deleteOrganizationEmbeddings } from "./core/delete-embeddings";
export {
  findEmbeddingsForSource,
  findAllOrganizationEmbeddings,
} from "./core/find-existing-embeddings";
export type { ExistingEmbedding } from "./core/find-existing-embeddings";

// Sync functionality
export { syncOrganizationEmbeddings } from "./sync/sync-organization";

// Utilities
export { chunkText } from "./utils/chunk-text";
export { extractTextFromPolicy } from "./utils/extract-policy-text";

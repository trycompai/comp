// Core functionality
export { vectorIndex } from './core/client';
export { generateEmbedding } from './core/generate-embedding';
export { findSimilarContent, type SimilarContentResult } from './core/find-similar';
export { upsertEmbedding, type EmbeddingMetadata, type SourceType } from './core/upsert-embedding';

// Utilities
export { chunkText } from './utils/chunk-text';
export { extractTextFromPolicy } from './utils/extract-policy-text';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extractContentFromFile } from '@/trigger/vector-store/helpers/extract-content-from-file';
import { vectorIndex } from '../core/client';
import { batchUpsertEmbeddings } from '../core/upsert-embedding';
import { chunkText } from '../utils/chunk-text';
import { logger } from '../../logger';
import type { ExistingEmbedding } from '../core/find-existing-embeddings';

export type SourceType =
  | 'policy'
  | 'context'
  | 'manual_answer'
  | 'knowledge_base_document';

export interface SyncStats {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
}

export interface ChunkItem {
  id: string;
  text: string;
  metadata: {
    organizationId: string;
    sourceType: SourceType;
    sourceId: string;
    content: string;
    updatedAt: string;
    [key: string]: string;
  };
}

/**
 * Creates an S3 client instance for Knowledge Base document processing
 */
export function createKnowledgeBaseS3Client(): S3Client {
  const region = process.env.APP_AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS S3 credentials are missing. Please set APP_AWS_ACCESS_KEY_ID and APP_AWS_SECRET_ACCESS_KEY environment variables.',
    );
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Extracts content from a Knowledge Base document stored in S3
 */
export async function extractContentFromS3Document(
  s3Key: string,
  fileType: string,
): Promise<string> {
  const knowledgeBaseBucket = process.env.APP_AWS_KNOWLEDGE_BASE_BUCKET;

  if (!knowledgeBaseBucket) {
    throw new Error(
      'Knowledge base bucket is not configured. Please set APP_AWS_KNOWLEDGE_BASE_BUCKET environment variable.',
    );
  }

  const s3Client = createKnowledgeBaseS3Client();

  const getCommand = new GetObjectCommand({
    Bucket: knowledgeBaseBucket,
    Key: s3Key,
  });

  const response = await s3Client.send(getCommand);

  if (!response.Body) {
    throw new Error('Failed to retrieve file from S3');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64Data = buffer.toString('base64');

  const detectedFileType =
    response.ContentType || fileType || 'application/octet-stream';
  return extractContentFromFile(base64Data, detectedFileType);
}

/**
 * Check if embeddings need to be updated based on updatedAt timestamp
 */
export function needsUpdate(
  existingEmbeddings: ExistingEmbedding[],
  updatedAt: string,
): boolean {
  return (
    existingEmbeddings.length === 0 ||
    existingEmbeddings.some((e) => !e.updatedAt || e.updatedAt < updatedAt)
  );
}

/**
 * Delete old embeddings by IDs
 */
export async function deleteOldEmbeddings(
  embeddings: ExistingEmbedding[],
  logContext: Record<string, string>,
): Promise<void> {
  if (embeddings.length === 0 || !vectorIndex) {
    return;
  }

  const idsToDelete = embeddings.map((e) => e.id);
  try {
    await vectorIndex.delete(idsToDelete);
  } catch (error) {
    logger.warn('Failed to delete old embeddings', {
      ...logContext,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create chunk items from text for embedding
 */
export function createChunkItems(
  text: string,
  sourceId: string,
  sourceType: SourceType,
  organizationId: string,
  updatedAt: string,
  idPrefix: string,
  extraMetadata: Record<string, string> = {},
  chunkSize = 500,
  overlap = 50,
): ChunkItem[] {
  const chunks = chunkText(text, chunkSize, overlap);

  return chunks
    .map((chunk, chunkIndex) => ({
      id: `${idPrefix}_${sourceId}_chunk${chunkIndex}`,
      text: chunk,
      metadata: {
        organizationId,
        sourceType,
        sourceId,
        content: chunk,
        updatedAt,
        ...extraMetadata,
      },
    }))
    .filter((item) => item.text && item.text.trim().length > 0);
}

/**
 * Upsert chunk items to vector store
 */
export async function upsertChunks(chunkItems: ChunkItem[]): Promise<void> {
  if (chunkItems.length > 0) {
    await batchUpsertEmbeddings(chunkItems);
  }
}

/**
 * Initialize sync stats
 */
export function initSyncStats(total: number): SyncStats {
  return {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total,
  };
}

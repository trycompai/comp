import 'server-only';

import { Index } from '@upstash/vector';
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { createHash } from 'node:crypto';

export type EntityKind = 'risk' | 'vendor' | 'task';

interface EntityInput {
  id: string;
  text: string;
  department?: string;
}

interface UpsertOptions {
  organizationId: string;
  kind: EntityKind;
  entities: EntityInput[];
  /**
   * Optional id → hash map of the embeddings currently stored for these
   * entities. Any entity whose freshly-computed `contentHash` matches its
   * stored value is skipped — both the OpenAI embedding call AND the
   * Upstash upsert. Pass an empty map (or omit) to force re-embedding.
   *
   * Stored hashes live on `Task/Risk/Vendor.embeddingHash` in Postgres;
   * `runLinkage` reads them up-front and writes the new hashes back after
   * upsert via `appliedHashes`.
   */
  existingHashes?: Map<string, string>;
}

export interface UpsertEntityEmbeddingsResult {
  /** Newly embedded entities that should have their hash persisted. */
  appliedHashes: Array<{ id: string; hash: string }>;
  /** How many entities we skipped because their content was unchanged. */
  skippedCount: number;
}

interface FindSimilarTasksOptions {
  organizationId: string;
  queryText: string;
  topK?: number;
}

export interface SimilarTaskResult {
  id: string; // raw task id (sourceId), not the prefixed embedding id
  score: number;
  department?: string;
}

// `text-embedding-3-large` truncated to 1536 dims via Matryoshka. The
// truncated 1536-dim form of -3-large still outperforms -3-small on MTEB
// while keeping the existing Upstash Vector index (which is provisioned at
// 1536 dims) usable as-is. Bumping to the full 3072 dims would require a
// new index + a one-time re-embed of every org.
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_TOP_K = 25;

let cachedIndex: Index | null = null;

function getIndex(): Index {
  if (cachedIndex) return cachedIndex;
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Upstash Vector is not configured (UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN)',
    );
  }
  cachedIndex = new Index({ url, token });
  return cachedIndex;
}

function embeddingId(kind: EntityKind, organizationId: string, sourceId: string): string {
  return `${kind}_${organizationId}_${sourceId}`;
}

/**
 * Stable hash of everything that determines the stored embedding: the text
 * (which produces the vector), the model + dimensions (which model produced
 * it), and the department (which is stored as metadata and returned by
 * queries). Any change to these fields requires a re-embed AND a re-upsert.
 *
 * Exported so callers writing the hash back to Postgres can compute it
 * exactly the way the upsert path does.
 */
export function computeEntityContentHash({
  text,
  department,
}: {
  text: string;
  department?: string;
}): string {
  return createHash('sha256')
    .update(`${EMBEDDING_MODEL}:${EMBEDDING_DIMENSIONS}:${department ?? ''}:${text}`)
    .digest('hex');
}

/**
 * Upsert per-org entity embeddings into Upstash Vector.
 *
 * NOTE: this duplicates a thin slice of `apps/api/src/vector-store/`. Consolidate
 * into a shared package as a follow-up — keeping it here avoids cross-app imports
 * for the trigger task without a refactor.
 */
export async function upsertEntityEmbeddings({
  organizationId,
  kind,
  entities,
  existingHashes,
}: UpsertOptions): Promise<UpsertEntityEmbeddingsResult> {
  const valid = entities.filter((e) => e.text.trim().length > 0);
  if (valid.length === 0) return { appliedHashes: [], skippedCount: 0 };

  // Skip entities whose stored hash matches the current content hash —
  // text + model + dims + department haven't changed, so the existing
  // vector is still authoritative. Saves the OpenAI embed AND the Upstash
  // upsert (the two non-trivial costs in this path).
  const withHashes = valid.map((entity) => ({
    entity,
    hash: computeEntityContentHash({ text: entity.text, department: entity.department }),
  }));
  const toEmbed = withHashes.filter(
    ({ entity, hash }) => existingHashes?.get(entity.id) !== hash,
  );
  const skippedCount = withHashes.length - toEmbed.length;
  if (toEmbed.length === 0) {
    return { appliedHashes: [], skippedCount };
  }

  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: toEmbed.map(({ entity }) => entity.text),
    providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
  });

  const index = getIndex();
  await Promise.all(
    toEmbed.map(({ entity }, i) =>
      index.upsert({
        id: embeddingId(kind, organizationId, entity.id),
        vector: embeddings[i],
        metadata: {
          organizationId,
          sourceType: kind,
          sourceId: entity.id,
          content: entity.text.substring(0, 1000),
          ...(entity.department ? { department: entity.department } : {}),
        },
      }),
    ),
  );

  return {
    appliedHashes: toEmbed.map(({ entity, hash }) => ({ id: entity.id, hash })),
    skippedCount,
  };
}

/**
 * Find the top-K most similar Tasks in an org for a given query string.
 * Returns raw task ids (not prefixed embedding ids) along with score + department.
 */
export async function findSimilarTasks({
  organizationId,
  queryText,
  topK = DEFAULT_TOP_K,
}: FindSimilarTasksOptions): Promise<SimilarTaskResult[]> {
  if (!queryText.trim()) return [];

  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: [queryText],
    providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
  });

  const index = getIndex();
  const results = await index.query({
    vector: embeddings[0],
    topK,
    includeMetadata: true,
    filter: `organizationId = "${organizationId}" AND sourceType = "task"`,
  });

  return results.map((r) => {
    const meta = (r.metadata ?? {}) as { sourceId?: string; department?: string };
    return {
      id: meta.sourceId ?? String(r.id),
      score: r.score,
      department: meta.department ?? undefined,
    };
  });
}

interface WaitForIndexedOptions {
  /** Hard ceiling. Resolves with `pendingAtTimeout` set if exceeded. */
  maxWaitMs?: number;
  /** Poll cadence. */
  intervalMs?: number;
}

export interface WaitForIndexedResult {
  waitedMs: number;
  polls: number;
  /** Defined only when we hit `maxWaitMs` without reaching pending=0. */
  pendingAtTimeout?: number;
}

/**
 * Block until Upstash Vector has finished indexing every previously-upserted
 * vector (i.e. `info().pendingVectorCount === 0`).
 *
 * Upstash returns 200 from `upsert` as soon as the write is durable, but the
 * HNSW index is built asynchronously. Vectors sit in `pendingVectorCount` for
 * a few hundred ms to several seconds before they become queryable. Querying
 * during that window returns empty results for the not-yet-indexed IDs even
 * though the upsert succeeded — see ENG-221 for the race we hit during
 * onboarding (6 of 11 risks got 0 cosine candidates because their queries
 * raced ahead of indexing).
 *
 * Call this AFTER `upsertEntityEmbeddings` and BEFORE any query that depends
 * on the just-written vectors being searchable.
 */
export async function waitForIndexed({
  maxWaitMs = 30_000,
  intervalMs = 250,
}: WaitForIndexedOptions = {}): Promise<WaitForIndexedResult> {
  const index = getIndex();
  const start = Date.now();
  let polls = 0;
  while (Date.now() - start < maxWaitMs) {
    polls += 1;
    const info = await index.info();
    if (info.pendingVectorCount === 0) {
      return { waitedMs: Date.now() - start, polls };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  // Timed out — fetch one more time so the caller can log how far behind we are.
  const final = await index.info().catch(() => null);
  return {
    waitedMs: Date.now() - start,
    polls,
    pendingAtTimeout: final?.pendingVectorCount,
  };
}

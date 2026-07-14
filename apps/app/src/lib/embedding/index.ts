import 'server-only';

import { Index, type RangeResult } from '@upstash/vector';
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
// Pagination for enumerating an org's task vectors by their shared id prefix —
// used by both `findSimilarTasks` (exact in-process ranking) and
// `pruneOrphanTaskVectors` (orphan sweep). Prefix enumeration has no top-K
// ceiling; page size only controls how many vectors come back per round trip.
const TASK_VECTOR_PAGE_SIZE = 1000;
// Backstop so a misbehaving cursor can't loop forever. 500 pages × 1000 = 500k
// task vectors, far beyond any real org — hitting it signals a bug, not scale.
const TASK_VECTOR_MAX_PAGES = 500;

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

function embeddingIdPrefix(kind: EntityKind, organizationId: string): string {
  return `${kind}_${organizationId}_`;
}

function embeddingId(kind: EntityKind, organizationId: string, sourceId: string): string {
  return `${embeddingIdPrefix(kind, organizationId)}${sourceId}`;
}

/**
 * Inverse of `embeddingId`: recover the raw source id from a prefixed embedding
 * id. Used only as a fallback for vectors written before `metadata.sourceId`
 * existed — treating the prefixed id as a raw source id would misidentify the
 * entity, so `pruneOrphanTaskVectors` could delete a live task's vector (its
 * prefixed id never matches the raw-id `liveTaskIds` set) and clear the hash of
 * a row that doesn't exist.
 */
function sourceIdFromEmbeddingId(
  kind: EntityKind,
  organizationId: string,
  id: string,
): string {
  const prefix = embeddingIdPrefix(kind, organizationId);
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
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

interface OrgTaskVector {
  /** raw task id (sourceId), not the prefixed embedding id */
  sourceId: string;
  vector: number[];
  department?: string;
}

/**
 * Enumerate an org's task vectors (with their embeddings) by their shared id
 * prefix. Every task vector is keyed `task_${organizationId}_${sourceId}` (see
 * `embeddingId`), so a cursor-paginated `range` returns exactly this org's task
 * vectors — no metadata filter, no top-K ceiling.
 */
async function fetchOrgTaskVectors(organizationId: string): Promise<OrgTaskVector[]> {
  const index = getIndex();
  const prefix = embeddingIdPrefix('task', organizationId);

  const out: OrgTaskVector[] = [];
  let cursor: string | number = '0';
  let enumeratedFully = false;
  for (let page = 0; page < TASK_VECTOR_MAX_PAGES; page++) {
    const { vectors, nextCursor }: RangeResult = await index.range({
      cursor,
      limit: TASK_VECTOR_PAGE_SIZE,
      prefix,
      includeVectors: true,
      includeMetadata: true,
    });
    for (const r of vectors) {
      if (!r.vector) continue; // defensive: skip any vector row missing embeddings
      const meta = (r.metadata ?? {}) as { sourceId?: string; department?: string };
      out.push({
        sourceId: meta.sourceId ?? sourceIdFromEmbeddingId('task', organizationId, String(r.id)),
        vector: r.vector as number[],
        department: meta.department ?? undefined,
      });
    }
    if (!nextCursor) {
      enumeratedFully = true;
      break;
    }
    cursor = nextCursor;
  }
  if (!enumeratedFully) {
    console.warn(
      `[embedding] task-vector enumeration hit the ${TASK_VECTOR_MAX_PAGES}-page cap for org ${organizationId} after ${out.length} vector(s); ranking may be incomplete`,
    );
  }
  return out;
}

/**
 * Cosine similarity mapped to Upstash's COSINE score scale, `(1 + cos) / 2`, so
 * scores stay in [0, 1] and are drop-in compatible with the department boost /
 * threshold in `linkSuggestions` and the reranker's `cosineScore` hint.
 */
export function cosineToUnitScore(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const cos = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return (1 + cos) / 2;
}

/**
 * Find the top-K most similar Tasks in an org for a given query string.
 * Returns raw task ids (not prefixed embedding ids) along with score + department.
 *
 * Retrieval enumerates the org's task vectors by id prefix and scores them
 * exactly in-process, rather than issuing a metadata-filtered ANN query. A
 * filtered `query` (`organizationId AND sourceType`) collapses to near-zero
 * recall here: one org is a tiny slice of a 180k+ vector shared-namespace index,
 * so Upstash's approximate traversal exhausts its candidate budget on nearer,
 * non-matching vectors before reaching this org's tasks — returning 0 candidates
 * even when relevant tasks exist, which starved treatment plans of every
 * suggestion (CS-681). An org holds at most low-hundreds of tasks, so exact
 * scoring over the full set is both correct (no recall loss) and cheap.
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
  const queryVector = embeddings[0];

  const taskVectors = await fetchOrgTaskVectors(organizationId);
  if (taskVectors.length === 0) return [];

  return taskVectors
    .map((t) => ({
      id: t.sourceId,
      score: cosineToUnitScore(queryVector, t.vector),
      department: t.department,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export interface PruneOrphanTaskVectorsResult {
  /** sourceIds of the task vectors that were deleted from Upstash. */
  deletedSourceIds: string[];
  /** How many of the org's task vectors were examined. */
  scanned: number;
}

/**
 * Delete an org's task vectors whose `sourceId` is no longer in the live task
 * scope. `lib/embedding` only ever UPSERTS task vectors — it has no other
 * delete path — so tasks that are deleted, or whose controls all get archived
 * (dropping them from `runLinkage`'s scope query), leave orphan vectors behind
 * indefinitely. Those orphans are still returned by `findSimilarTasks` (which
 * filters on organizationId + sourceType only) and, being embedded from real
 * compliance work, sit cosine-near the live tasks — crowding them out of the
 * top-K recall entirely and starving risks/vendors of suggestions (CS-681).
 *
 * Every task vector is keyed `task_${organizationId}_${sourceId}` (see
 * `embeddingId`), so a cursor-paginated `range` over that id prefix enumerates
 * exactly this org's task vectors with no top-K ceiling — a bounded `query`
 * would silently miss any orphans past its window on a large org. The returned
 * `deletedSourceIds` let the caller clear each task's stored `embeddingHash`,
 * keeping "no vector" consistent with "no hash" so a task that later re-enters
 * scope re-embeds instead of being skipped by the dedup guard. Only sourceIds
 * whose vector was actually deleted are returned, so a transient delete failure
 * never desynchronizes that pairing.
 */
export async function pruneOrphanTaskVectors({
  organizationId,
  liveTaskIds,
}: {
  organizationId: string;
  /** sourceIds of the tasks currently in the linkage scope. */
  liveTaskIds: Set<string>;
}): Promise<PruneOrphanTaskVectorsResult> {
  const index = getIndex();
  const prefix = embeddingIdPrefix('task', organizationId);

  // Enumerate the org's task vectors page by page over their shared id prefix.
  // Upstash returns `nextCursor === ''` when the last page is drained; the page
  // cap is a runaway backstop (a healthy cursor always terminates first).
  const orphans: Array<{ vectorId: string; sourceId: string }> = [];
  let scanned = 0;
  let cursor: string | number = '0';
  let enumeratedFully = false;
  for (let page = 0; page < TASK_VECTOR_MAX_PAGES; page++) {
    // Annotate the result explicitly: `cursor = nextCursor` would otherwise make
    // TS infer `nextCursor`'s type from a binding that depends on it (TS7022).
    const { vectors, nextCursor }: RangeResult = await index.range({
      cursor,
      limit: TASK_VECTOR_PAGE_SIZE,
      prefix,
      includeMetadata: true,
    });
    scanned += vectors.length;
    for (const r of vectors) {
      const meta = (r.metadata ?? {}) as { sourceId?: string };
      const sourceId =
        meta.sourceId ?? sourceIdFromEmbeddingId('task', organizationId, String(r.id));
      if (liveTaskIds.has(sourceId)) continue;
      orphans.push({ vectorId: String(r.id), sourceId });
    }
    if (!nextCursor) {
      enumeratedFully = true;
      break;
    }
    cursor = nextCursor;
  }
  if (!enumeratedFully) {
    console.warn(
      `[embedding] orphan sweep hit the ${TASK_VECTOR_MAX_PAGES}-page cap for org ${organizationId} after scanning ${scanned} vector(s); enumeration may be incomplete`,
    );
  }

  if (orphans.length === 0) {
    return { deletedSourceIds: [], scanned };
  }

  // Delete in batches, resilient to transient failures: a failing batch is
  // logged and skipped so later batches still run, and only the sourceIds whose
  // vector was actually deleted are returned. That keeps hash-clearing aligned
  // with real deletions — clearing a hash whose vector survived would leave a
  // task that re-embeds needlessly, but never one with a cached hash and no
  // vector (which would be skipped by the dedup guard and never re-embed).
  const deletedSourceIds: string[] = [];
  const BATCH = 100;
  for (let i = 0; i < orphans.length; i += BATCH) {
    const batch = orphans.slice(i, i + BATCH);
    try {
      await index.delete(batch.map((o) => o.vectorId));
      deletedSourceIds.push(...batch.map((o) => o.sourceId));
    } catch (err) {
      console.error(
        `[embedding] orphan vector delete batch failed for org ${organizationId} (${batch.length} id(s)); continuing`,
        err,
      );
    }
  }

  return { deletedSourceIds, scanned };
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

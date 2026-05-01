import { Departments } from '@db';
import { Index } from '@upstash/vector';
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';

export type EntityKind = 'risk' | 'vendor' | 'task';

interface EntityInput {
  id: string;
  text: string;
  department?: Departments;
}

interface UpsertOptions {
  organizationId: string;
  kind: EntityKind;
  entities: EntityInput[];
}

interface FindSimilarTasksOptions {
  organizationId: string;
  queryText: string;
  topK?: number;
}

export interface SimilarTaskResult {
  id: string; // raw task id (sourceId), not the prefixed embedding id
  score: number;
  department?: Departments;
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
}: UpsertOptions): Promise<void> {
  const valid = entities.filter((e) => e.text.trim().length > 0);
  if (valid.length === 0) return;

  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: valid.map((e) => e.text),
    providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
  });

  const index = getIndex();
  await Promise.all(
    valid.map((entity, i) =>
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
      department: meta.department ? (meta.department as Departments) : undefined,
    };
  });
}

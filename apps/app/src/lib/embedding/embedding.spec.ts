import { Departments } from '@db';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsertMock = vi.fn();
const queryMock = vi.fn();
const infoMock = vi.fn();
const deleteMock = vi.fn();
const rangeMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@upstash/vector', () => ({
  Index: vi.fn().mockImplementation(() => ({
    upsert: upsertMock,
    query: queryMock,
    info: infoMock,
    delete: deleteMock,
    range: rangeMock,
    fetch: fetchMock,
  })),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: {
    embedding: () => 'mock-embedding-model',
  },
}));

vi.mock('ai', () => ({
  embedMany: vi.fn(async ({ values }: { values: string[] }) => ({
    embeddings: values.map((_, i) => Array(1536).fill(i / values.length)),
  })),
}));

import { embedMany } from 'ai';
import {
  upsertEntityEmbeddings,
  findSimilarTasks,
  cosineToUnitScore,
  computeEntityContentHash,
  waitForIndexed,
  pruneOrphanTaskVectors,
} from './index';

beforeEach(() => {
  upsertMock.mockReset();
  queryMock.mockReset();
  infoMock.mockReset();
  deleteMock.mockReset();
  rangeMock.mockReset();
  fetchMock.mockReset();
  // Default: every requested vector is present in Upstash, so the dedup guard's
  // existence check confirms hash-matched entities can be safely skipped. Tests
  // exercising the missing-vector desync override this to return null per id.
  fetchMock.mockImplementation(async (ids: string[]) => ids.map((id) => ({ id })));
  process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
  process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';
});

describe('upsertEntityEmbeddings', () => {
  it('upserts each entity with the right id format and returns applied hashes', async () => {
    const result = await upsertEntityEmbeddings({
      organizationId: 'org_1',
      kind: 'risk',
      entities: [
        { id: 'rsk_a', text: 'phishing risk' },
        { id: 'rsk_b', text: 'data breach risk' },
      ],
    });
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'risk_org_1_rsk_a',
        metadata: expect.objectContaining({
          organizationId: 'org_1',
          sourceType: 'risk',
          sourceId: 'rsk_a',
        }),
      }),
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'risk_org_1_rsk_b',
      }),
    );
    expect(result.appliedHashes.map((h) => h.id).sort()).toEqual(['rsk_a', 'rsk_b']);
    expect(result.appliedHashes.every((h) => /^[a-f0-9]{64}$/.test(h.hash))).toBe(true);
    expect(result.skippedCount).toBe(0);
  });

  it('skips entities with empty text', async () => {
    const result = await upsertEntityEmbeddings({
      organizationId: 'org_1',
      kind: 'task',
      entities: [
        { id: 'tsk_a', text: '' },
        { id: 'tsk_b', text: '   ' },
        { id: 'tsk_c', text: 'real task' },
      ],
    });
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task_org_1_tsk_c' }),
    );
    expect(result.appliedHashes.map((h) => h.id)).toEqual(['tsk_c']);
  });

  it('persists department in metadata when provided', async () => {
    await upsertEntityEmbeddings({
      organizationId: 'org_1',
      kind: 'task',
      entities: [
        { id: 'tsk_a', text: 'hr task', department: Departments.hr },
      ],
    });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ department: 'hr' }),
      }),
    );
  });

  it('skips entities whose existing hash matches (no embed, no upsert)', async () => {
    // First call: capture the hashes Upstash sees written.
    const first = await upsertEntityEmbeddings({
      organizationId: 'org_1',
      kind: 'task',
      entities: [
        { id: 'tsk_a', text: 'unchanged text', department: Departments.hr },
        { id: 'tsk_b', text: 'also unchanged' },
      ],
    });
    expect(upsertMock).toHaveBeenCalledTimes(2);

    upsertMock.mockClear();

    // Second call with the SAME content + the recorded hashes — should skip.
    const existing = new Map(first.appliedHashes.map((h) => [h.id, h.hash]));
    const second = await upsertEntityEmbeddings({
      organizationId: 'org_1',
      kind: 'task',
      entities: [
        { id: 'tsk_a', text: 'unchanged text', department: Departments.hr },
        { id: 'tsk_b', text: 'also unchanged' },
      ],
      existingHashes: existing,
    });
    expect(upsertMock).not.toHaveBeenCalled();
    expect(second.appliedHashes).toEqual([]);
    expect(second.skippedCount).toBe(2);
  });

  it('only re-embeds entities whose text or department changed', async () => {
    const first = await upsertEntityEmbeddings({
      organizationId: 'org_1',
      kind: 'task',
      entities: [
        { id: 'tsk_a', text: 'original text' },
        { id: 'tsk_b', text: 'stable text' },
        { id: 'tsk_c', text: 'no department' },
      ],
    });
    upsertMock.mockClear();

    const existing = new Map(first.appliedHashes.map((h) => [h.id, h.hash]));
    const second = await upsertEntityEmbeddings({
      organizationId: 'org_1',
      kind: 'task',
      entities: [
        { id: 'tsk_a', text: 'updated text' }, // text changed → re-embed
        { id: 'tsk_b', text: 'stable text' }, // unchanged → skip
        { id: 'tsk_c', text: 'no department', department: Departments.hr }, // dept added → re-embed
      ],
      existingHashes: existing,
    });
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(second.appliedHashes.map((h) => h.id).sort()).toEqual(['tsk_a', 'tsk_c']);
    expect(second.skippedCount).toBe(1);
  });

  it('re-embeds a hash-matched entity whose vector is missing from Upstash (CS-681)', async () => {
    // Desync: the stored hash matches the current content (dedup guard would
    // normally skip), but the vector is GONE from Upstash (index re-provision /
    // eviction / partial delete). Skipping on the hash alone never rewrites the
    // vector, so findSimilarTasks enumerates zero candidates and "Draft plan &
    // suggest links" returns 0/0 forever — the hash never changes so it recurs
    // on every run. The guard must detect the absent vector and re-embed it.
    const text = 'unchanged task content';
    const hash = computeEntityContentHash({ text });

    // tsk_present still has its vector; tsk_missing's is gone.
    fetchMock.mockImplementation(async (ids: string[]) =>
      ids.map((id) => (id === 'task_org_1_tsk_missing' ? null : { id })),
    );

    const result = await upsertEntityEmbeddings({
      organizationId: 'org_1',
      kind: 'task',
      entities: [
        { id: 'tsk_present', text },
        { id: 'tsk_missing', text },
      ],
      existingHashes: new Map([
        ['tsk_present', hash],
        ['tsk_missing', hash],
      ]),
    });

    // Only the vectorless task is re-embedded + re-upserted; the present one
    // stays skipped (the hash optimization still holds when the vector exists).
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task_org_1_tsk_missing' }),
    );
    expect(result.appliedHashes).toEqual([{ id: 'tsk_missing', hash }]);
    expect(result.skippedCount).toBe(1);
  });
});

describe('cosineToUnitScore', () => {
  it('maps identical vectors to 1, opposite to 0, orthogonal to 0.5', () => {
    expect(cosineToUnitScore([1, 0], [1, 0])).toBeCloseTo(1, 10);
    expect(cosineToUnitScore([1, 0], [-1, 0])).toBeCloseTo(0, 10);
    expect(cosineToUnitScore([1, 0], [0, 1])).toBeCloseTo(0.5, 10);
  });

  it('is magnitude-invariant (pure cosine) and matches Upstash (1+cos)/2', () => {
    // Same direction, different magnitudes → still 1.
    expect(cosineToUnitScore([2, 0], [5, 0])).toBeCloseTo(1, 10);
    // cos = 0.6 → (1 + 0.6) / 2 = 0.8
    expect(cosineToUnitScore([3, 4], [3, 0])).toBeCloseTo(0.8, 10);
  });

  it('returns 0 for a zero vector instead of NaN', () => {
    expect(cosineToUnitScore([0, 0], [1, 1])).toBe(0);
    expect(cosineToUnitScore([1, 1], [0, 0])).toBe(0);
  });
});

describe('findSimilarTasks', () => {
  // Range page helper — `nextCursor: ''` signals the enumeration is drained.
  function taskPage(
    vectors: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>,
  ) {
    rangeMock.mockResolvedValueOnce({ nextCursor: '', vectors });
  }

  it('enumerates the org task vectors by prefix and ranks them in-process by cosine', async () => {
    // Query points along [1,0]; task vectors are chosen so the cosine ordering
    // is deterministic: tsk_a (identical) > tsk_b (orthogonal) > tsk_c (opposite).
    vi.mocked(embedMany).mockResolvedValueOnce({ embeddings: [[1, 0]] } as never);
    taskPage([
      { id: 'task_org_1_tsk_b', vector: [0, 1], metadata: { sourceId: 'tsk_b', department: 'none' } },
      { id: 'task_org_1_tsk_a', vector: [1, 0], metadata: { sourceId: 'tsk_a', department: 'hr' } },
      { id: 'task_org_1_tsk_c', vector: [-1, 0], metadata: { sourceId: 'tsk_c' } },
    ]);

    const results = await findSimilarTasks({
      organizationId: 'org_1',
      queryText: 'phishing risk',
      topK: 10,
    });

    // Enumerates via prefix range WITH the stored vectors — never an ANN query.
    expect(rangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: '0',
        prefix: 'task_org_1_',
        includeVectors: true,
        includeMetadata: true,
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
    // Sorted by score desc, scores on Upstash's (1+cos)/2 scale.
    expect(results).toEqual([
      { id: 'tsk_a', score: 1, department: 'hr' },
      { id: 'tsk_b', score: 0.5, department: 'none' },
      { id: 'tsk_c', score: 0, department: undefined },
    ]);
  });

  it('applies the topK cap after ranking', async () => {
    vi.mocked(embedMany).mockResolvedValueOnce({ embeddings: [[1, 0]] } as never);
    taskPage([
      { id: 'task_org_1_tsk_a', vector: [1, 0], metadata: { sourceId: 'tsk_a' } },
      { id: 'task_org_1_tsk_b', vector: [0.9, 0.1], metadata: { sourceId: 'tsk_b' } },
      { id: 'task_org_1_tsk_c', vector: [-1, 0], metadata: { sourceId: 'tsk_c' } },
    ]);

    const results = await findSimilarTasks({
      organizationId: 'org_1',
      queryText: 'phishing risk',
      topK: 2,
    });

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toEqual(['tsk_a', 'tsk_b']);
  });

  it('paginates the enumeration across cursor pages', async () => {
    vi.mocked(embedMany).mockResolvedValueOnce({ embeddings: [[1, 0]] } as never);
    rangeMock
      .mockResolvedValueOnce({
        nextCursor: 'cursor_2',
        vectors: [{ id: 'task_org_1_tsk_p1', vector: [1, 0], metadata: { sourceId: 'tsk_p1' } }],
      })
      .mockResolvedValueOnce({
        nextCursor: '',
        vectors: [{ id: 'task_org_1_tsk_p2', vector: [0, 1], metadata: { sourceId: 'tsk_p2' } }],
      });

    const results = await findSimilarTasks({ organizationId: 'org_1', queryText: 'x' });

    expect(rangeMock).toHaveBeenCalledTimes(2);
    expect(rangeMock.mock.calls[1][0]).toEqual(
      expect.objectContaining({ cursor: 'cursor_2', prefix: 'task_org_1_' }),
    );
    // A task from page 2 is included in the ranking.
    expect(results.map((r) => r.id).sort()).toEqual(['tsk_p1', 'tsk_p2']);
  });

  it('returns empty when query text is empty (no embed, no range)', async () => {
    const results = await findSimilarTasks({ organizationId: 'org_1', queryText: '   ' });
    expect(results).toEqual([]);
    expect(rangeMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns empty when the org has no task vectors', async () => {
    vi.mocked(embedMany).mockResolvedValueOnce({ embeddings: [[1, 0]] } as never);
    taskPage([]);
    const results = await findSimilarTasks({ organizationId: 'org_1', queryText: 'x' });
    expect(results).toEqual([]);
  });

  it('recovers the raw task id from the prefix when metadata.sourceId is missing', async () => {
    // Legacy vector with no sourceId metadata. Returning the prefixed embedding
    // id would make runLinkage drop it as "not in live scope" (taskById is keyed
    // by raw ids), silently starving suggestions. (cubic P1)
    vi.mocked(embedMany).mockResolvedValueOnce({ embeddings: [[1, 0]] } as never);
    taskPage([{ id: 'task_org_1_tsk_legacy', vector: [1, 0], metadata: {} }]);

    const results = await findSimilarTasks({ organizationId: 'org_1', queryText: 'phishing risk' });

    expect(results).toEqual([{ id: 'tsk_legacy', score: 1, department: undefined }]);
  });
});

describe('waitForIndexed', () => {
  function infoResult(pendingVectorCount: number) {
    return {
      vectorCount: 100,
      pendingVectorCount,
      indexSize: 1024,
      dimension: 1536,
      similarityFunction: 'COSINE' as const,
      namespaces: {},
    };
  }

  it('returns immediately when pending count is already zero', async () => {
    infoMock.mockResolvedValueOnce(infoResult(0));

    const result = await waitForIndexed({ maxWaitMs: 5000, intervalMs: 50 });

    expect(result.polls).toBe(1);
    expect(result.pendingAtTimeout).toBeUndefined();
    expect(infoMock).toHaveBeenCalledTimes(1);
  });

  it('polls until pending drains to zero', async () => {
    infoMock
      .mockResolvedValueOnce(infoResult(5))
      .mockResolvedValueOnce(infoResult(2))
      .mockResolvedValueOnce(infoResult(0));

    const result = await waitForIndexed({ maxWaitMs: 5000, intervalMs: 10 });

    expect(result.polls).toBe(3);
    expect(result.pendingAtTimeout).toBeUndefined();
    expect(infoMock).toHaveBeenCalledTimes(3);
  });

  it('returns with pendingAtTimeout when the deadline elapses before pending hits zero', async () => {
    // Always return non-zero pending — the timeout should kick in.
    infoMock.mockResolvedValue(infoResult(7));

    const result = await waitForIndexed({ maxWaitMs: 80, intervalMs: 20 });

    expect(result.pendingAtTimeout).toBe(7);
    expect(result.waitedMs).toBeGreaterThanOrEqual(80);
    // The timeout polls + the trailing diagnostic info() call.
    expect(infoMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('pruneOrphanTaskVectors', () => {
  // Single-page range result: `nextCursor: ''` tells the sweep it's drained.
  function onePage(vectors: Array<{ id: string; metadata?: { sourceId?: string } }>) {
    rangeMock.mockResolvedValueOnce({ nextCursor: '', vectors });
  }

  it('deletes only vectors whose sourceId is not in the live task set', async () => {
    onePage([
      { id: 'task_org_1_tsk_live', metadata: { sourceId: 'tsk_live' } },
      { id: 'task_org_1_tsk_orphan1', metadata: { sourceId: 'tsk_orphan1' } },
      { id: 'task_org_1_tsk_orphan2', metadata: { sourceId: 'tsk_orphan2' } },
    ]);
    deleteMock.mockResolvedValueOnce({ deleted: 2 });

    const result = await pruneOrphanTaskVectors({
      organizationId: 'org_1',
      liveTaskIds: new Set(['tsk_live']),
    });

    // Enumerates the org's task vectors via a prefix range (no topK ceiling),
    // starting from cursor '0'.
    expect(rangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: '0',
        prefix: 'task_org_1_',
        includeMetadata: true,
      }),
    );
    // No cosine query is used to enumerate for the prune.
    expect(queryMock).not.toHaveBeenCalled();
    // Deletes the orphan vectors by their prefixed embedding id — never the live one.
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith([
      'task_org_1_tsk_orphan1',
      'task_org_1_tsk_orphan2',
    ]);
    expect(result.deletedSourceIds).toEqual(['tsk_orphan1', 'tsk_orphan2']);
    expect(result.scanned).toBe(3);
  });

  it('does not call delete when every task vector is still live', async () => {
    onePage([
      { id: 'task_org_1_tsk_a', metadata: { sourceId: 'tsk_a' } },
      { id: 'task_org_1_tsk_b', metadata: { sourceId: 'tsk_b' } },
    ]);

    const result = await pruneOrphanTaskVectors({
      organizationId: 'org_1',
      liveTaskIds: new Set(['tsk_a', 'tsk_b']),
    });

    expect(deleteMock).not.toHaveBeenCalled();
    expect(result.deletedSourceIds).toEqual([]);
    expect(result.scanned).toBe(2);
  });

  it('batches deletes at 100 ids per call', async () => {
    // 250 orphans → three delete batches (100 + 100 + 50).
    const vectors = Array.from({ length: 250 }, (_, i) => ({
      id: `task_org_1_tsk_${i}`,
      metadata: { sourceId: `tsk_${i}` },
    }));
    onePage(vectors);
    deleteMock.mockResolvedValue({ deleted: 100 });

    const result = await pruneOrphanTaskVectors({
      organizationId: 'org_1',
      liveTaskIds: new Set(),
    });

    expect(deleteMock).toHaveBeenCalledTimes(3);
    expect(deleteMock.mock.calls[0][0]).toHaveLength(100);
    expect(deleteMock.mock.calls[1][0]).toHaveLength(100);
    expect(deleteMock.mock.calls[2][0]).toHaveLength(50);
    expect(result.deletedSourceIds).toHaveLength(250);
  });

  it('paginates the whole index via the cursor — orphans past page 1 are not missed', async () => {
    // Two pages: page 1 hands back a cursor, page 2 drains it. An orphan on the
    // SECOND page must still be found — the old top-1000 query would miss it on
    // a large org. (CS-681, cubic P2)
    rangeMock
      .mockResolvedValueOnce({
        nextCursor: 'cursor_2',
        vectors: [
          { id: 'task_org_1_tsk_live1', metadata: { sourceId: 'tsk_live1' } },
          { id: 'task_org_1_tsk_orphan_p1', metadata: { sourceId: 'tsk_orphan_p1' } },
        ],
      })
      .mockResolvedValueOnce({
        nextCursor: '',
        vectors: [
          { id: 'task_org_1_tsk_live2', metadata: { sourceId: 'tsk_live2' } },
          { id: 'task_org_1_tsk_orphan_p2', metadata: { sourceId: 'tsk_orphan_p2' } },
        ],
      });
    deleteMock.mockResolvedValue({ deleted: 1 });

    const result = await pruneOrphanTaskVectors({
      organizationId: 'org_1',
      liveTaskIds: new Set(['tsk_live1', 'tsk_live2']),
    });

    expect(rangeMock).toHaveBeenCalledTimes(2);
    // Second call reuses the returned cursor.
    expect(rangeMock.mock.calls[1][0]).toEqual(
      expect.objectContaining({ cursor: 'cursor_2', prefix: 'task_org_1_' }),
    );
    // Both orphans deleted, including the one on page 2.
    expect(result.deletedSourceIds.sort()).toEqual(['tsk_orphan_p1', 'tsk_orphan_p2']);
    expect(result.scanned).toBe(4);
  });

  it('falls back to the id-prefix when metadata.sourceId is missing (does not prune a live vector)', async () => {
    // Legacy vectors written before sourceId was stored in metadata. The raw
    // task id must be parsed from the `task_${org}_` prefix — treating the whole
    // prefixed id as a sourceId would (a) fail the liveTaskIds check and delete
    // a LIVE vector, and (b) push a bogus id into deletedSourceIds. (cubic P1)
    onePage([
      // Live task, but its vector has no sourceId metadata.
      { id: 'task_org_1_tsk_live', metadata: {} },
      // Genuine orphan, also missing sourceId metadata.
      { id: 'task_org_1_tsk_orphan', metadata: {} },
    ]);
    deleteMock.mockResolvedValueOnce({ deleted: 1 });

    const result = await pruneOrphanTaskVectors({
      organizationId: 'org_1',
      liveTaskIds: new Set(['tsk_live']),
    });

    // The live vector is preserved; only the true orphan is deleted...
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(['task_org_1_tsk_orphan']);
    // ...and deletedSourceIds carries the RAW task id, so the caller's
    // embeddingHash clear targets a real row.
    expect(result.deletedSourceIds).toEqual(['tsk_orphan']);
  });

  it('continues past a failing delete batch and returns only successfully-deleted sourceIds', async () => {
    // 150 orphans → two batches (100 + 50). The first batch's delete throws
    // (transient Upstash error); the sweep must still run batch 2 and must NOT
    // report batch 1's sourceIds as deleted — clearing their hashes while the
    // vectors survive is wasteful, but reporting them deleted while the vectors
    // are gone-but-cached would break re-embedding. (cubic P2)
    const vectors = Array.from({ length: 150 }, (_, i) => ({
      id: `task_org_1_tsk_${i}`,
      metadata: { sourceId: `tsk_${i}` },
    }));
    onePage(vectors);
    deleteMock
      .mockRejectedValueOnce(new Error('upstash 500'))
      .mockResolvedValueOnce({ deleted: 50 });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await pruneOrphanTaskVectors({
      organizationId: 'org_1',
      liveTaskIds: new Set(),
    });

    // Both batches attempted despite the first throwing.
    expect(deleteMock).toHaveBeenCalledTimes(2);
    // Only the second (successful) batch's 50 sourceIds are returned.
    expect(result.deletedSourceIds).toHaveLength(50);
    expect(result.deletedSourceIds).toEqual(
      vectors.slice(100).map((v) => v.metadata.sourceId),
    );
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

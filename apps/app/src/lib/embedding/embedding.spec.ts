import { Departments } from '@db';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsertMock = vi.fn();
const queryMock = vi.fn();
const infoMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('@upstash/vector', () => ({
  Index: vi.fn().mockImplementation(() => ({
    upsert: upsertMock,
    query: queryMock,
    info: infoMock,
    delete: deleteMock,
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

import {
  upsertEntityEmbeddings,
  findSimilarTasks,
  waitForIndexed,
  pruneOrphanTaskVectors,
  type EntityKind,
} from './index';

beforeEach(() => {
  upsertMock.mockReset();
  queryMock.mockReset();
  infoMock.mockReset();
  deleteMock.mockReset();
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
});

describe('findSimilarTasks', () => {
  it('queries with org + sourceType filter and returns id+score+department', async () => {
    queryMock.mockResolvedValueOnce([
      { id: 'task_org_1_tsk_a', score: 0.82, metadata: { sourceId: 'tsk_a', department: 'hr' } },
      { id: 'task_org_1_tsk_b', score: 0.71, metadata: { sourceId: 'tsk_b', department: 'none' } },
    ]);

    const results = await findSimilarTasks({
      organizationId: 'org_1',
      queryText: 'phishing risk',
      topK: 10,
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topK: 10,
        includeMetadata: true,
        filter: 'organizationId = "org_1" AND sourceType = "task"',
      }),
    );
    expect(results).toEqual([
      { id: 'tsk_a', score: 0.82, department: 'hr' },
      { id: 'tsk_b', score: 0.71, department: 'none' },
    ]);
  });

  it('returns empty when query text is empty', async () => {
    const results = await findSimilarTasks({
      organizationId: 'org_1',
      queryText: '   ',
    });
    expect(results).toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
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
  it('deletes only vectors whose sourceId is not in the live task set', async () => {
    queryMock.mockResolvedValueOnce([
      { id: 'task_org_1_tsk_live', score: 0.9, metadata: { sourceId: 'tsk_live' } },
      { id: 'task_org_1_tsk_orphan1', score: 0.8, metadata: { sourceId: 'tsk_orphan1' } },
      { id: 'task_org_1_tsk_orphan2', score: 0.7, metadata: { sourceId: 'tsk_orphan2' } },
    ]);
    deleteMock.mockResolvedValueOnce({ deleted: 2 });

    const result = await pruneOrphanTaskVectors({
      organizationId: 'org_1',
      liveTaskIds: new Set(['tsk_live']),
    });

    // Enumerates the org's task vectors with the org + task filter at max topK.
    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topK: 1000,
        includeMetadata: true,
        filter: 'organizationId = "org_1" AND sourceType = "task"',
      }),
    );
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
    queryMock.mockResolvedValueOnce([
      { id: 'task_org_1_tsk_a', score: 0.9, metadata: { sourceId: 'tsk_a' } },
      { id: 'task_org_1_tsk_b', score: 0.8, metadata: { sourceId: 'tsk_b' } },
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
      score: 0.5,
      metadata: { sourceId: `tsk_${i}` },
    }));
    queryMock.mockResolvedValueOnce(vectors);
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
});

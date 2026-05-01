import { Departments } from '@db';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsertMock = vi.fn();
const queryMock = vi.fn();

vi.mock('@upstash/vector', () => ({
  Index: vi.fn().mockImplementation(() => ({
    upsert: upsertMock,
    query: queryMock,
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
  type EntityKind,
} from './index';

beforeEach(() => {
  upsertMock.mockReset();
  queryMock.mockReset();
  process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
  process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';
});

describe('upsertEntityEmbeddings', () => {
  it('upserts each entity with the right id format', async () => {
    await upsertEntityEmbeddings({
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
  });

  it('skips entities with empty text', async () => {
    await upsertEntityEmbeddings({
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

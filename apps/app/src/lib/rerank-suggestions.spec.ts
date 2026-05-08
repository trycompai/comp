import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateObjectMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: () => 'mock-openai-model',
}));

vi.mock('ai', () => ({
  generateObject: generateObjectMock,
  jsonSchema: <T>(schema: T) => schema,
}));

import { rerankSuggestions } from './rerank-suggestions';

beforeEach(() => {
  generateObjectMock.mockReset();
});

describe('rerankSuggestions', () => {
  it('returns [] without calling the LLM when candidates is empty', async () => {
    const out = await rerankSuggestions({
      source: { kind: 'risk', title: 't', description: 'd' },
      candidates: [],
    });
    expect(out).toEqual([]);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it('orders candidates by LLM rerankScore desc', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        scores: [
          { id: 'tsk_a', score: 3 },
          { id: 'tsk_b', score: 9 },
          { id: 'tsk_c', score: 7 },
        ],
      },
    });

    const out = await rerankSuggestions({
      source: { kind: 'risk', title: 'Data leakage', description: 'laptops' },
      candidates: [
        { id: 'tsk_a', title: 'A', description: 'a', cosineScore: 0.9 },
        { id: 'tsk_b', title: 'B', description: 'b', cosineScore: 0.6 },
        { id: 'tsk_c', title: 'C', description: 'c', cosineScore: 0.7 },
      ],
    });

    expect(out.map((r) => r.id)).toEqual(['tsk_b', 'tsk_c', 'tsk_a']);
    expect(out[0].rerankScore).toBe(9);
    expect(out[0].cosineScore).toBe(0.6);
  });

  it('clamps scores outside 0-10 (LLM hallucination guard)', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        scores: [
          { id: 'tsk_a', score: -2 },
          { id: 'tsk_b', score: 15 },
          { id: 'tsk_c', score: Number.NaN },
        ],
      },
    });

    const out = await rerankSuggestions({
      source: { kind: 'risk', title: 't', description: 'd' },
      candidates: [
        { id: 'tsk_a', title: 'A', description: 'a', cosineScore: 0.5 },
        { id: 'tsk_b', title: 'B', description: 'b', cosineScore: 0.5 },
        { id: 'tsk_c', title: 'C', description: 'c', cosineScore: 0.5 },
      ],
    });

    const byId = Object.fromEntries(out.map((r) => [r.id, r.rerankScore]));
    expect(byId.tsk_a).toBe(0);
    expect(byId.tsk_b).toBe(10);
    expect(byId.tsk_c).toBe(0);
  });

  it('assigns 0 to candidates the LLM omits', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { scores: [{ id: 'tsk_a', score: 8 }] },
    });

    const out = await rerankSuggestions({
      source: { kind: 'vendor', title: 'V', description: 'd' },
      candidates: [
        { id: 'tsk_a', title: 'A', description: 'a', cosineScore: 0.5 },
        { id: 'tsk_b', title: 'B', description: 'b', cosineScore: 0.5 },
      ],
    });

    const byId = Object.fromEntries(out.map((r) => [r.id, r.rerankScore]));
    expect(byId.tsk_a).toBe(8);
    expect(byId.tsk_b).toBe(0);
  });
});

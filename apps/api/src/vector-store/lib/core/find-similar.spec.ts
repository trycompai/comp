jest.mock('./client', () => ({
  vectorIndex: { query: jest.fn() },
}));
jest.mock('./generate-embedding', () => ({
  generateEmbedding: jest.fn(),
  batchGenerateEmbeddings: jest.fn(),
}));

import { vectorIndex } from './client';
import {
  generateEmbedding,
  batchGenerateEmbeddings,
} from './generate-embedding';
import { findSimilarContent, findSimilarContentBatch } from './find-similar';

const mockQuery = vectorIndex!.query as jest.Mock;
const mockEmbed = generateEmbedding as jest.Mock;
const mockBatchEmbed = batchGenerateEmbeddings as jest.Mock;

/**
 * Builds `count` Upstash results, each from a DISTINCT policy, with strictly
 * descending scores starting at 0.9. This mirrors CS-594: a single question
 * matching a chunk of nearly every published policy just above the 0.2 noise
 * floor.
 */
function buildDistinctPolicyResults(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `vec_${i}`,
    score: Number((0.9 - i * 0.02).toFixed(4)),
    metadata: {
      content: `Policy chunk ${i}`,
      sourceType: 'policy',
      sourceId: `pol_${i}`,
      policyName: `Policy ${i}`,
      organizationId: 'org_test',
    },
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEmbed.mockResolvedValue([0.1, 0.2, 0.3]);
  mockBatchEmbed.mockResolvedValue([[0.1, 0.2, 0.3]]);
});

describe('findSimilarContent: result cap (CS-594)', () => {
  it('caps the number of returned chunks even when many distinct policies clear the noise floor', async () => {
    // 24 distinct policies all scoring >= 0.2 — reproduces Q#17 (24 sources).
    const flood = buildDistinctPolicyResults(24);
    expect(flood.every((r) => r.score >= 0.2)).toBe(true);
    mockQuery.mockResolvedValue(flood);

    const results = await findSimilarContent(
      'Where is the business located?',
      'org_test',
    );

    // Bug: returned all 24. Fix: bounded to a small, relevant set.
    expect(results.length).toBeLessThan(flood.length);
    expect(results.length).toBeLessThanOrEqual(10);
    expect(results.length).toBeGreaterThan(0);
  });

  it('keeps the highest-scoring chunks and drops the low-scoring tail', async () => {
    const flood = buildDistinctPolicyResults(24);
    mockQuery.mockResolvedValue(flood);

    const results = await findSimilarContent('any question', 'org_test');

    // The most relevant chunk must be present, sorted highest-first.
    expect(results[0].score).toBe(0.9);
    const scores = results.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    // The lowest-scoring chunks of the flood must be dropped, not surfaced.
    const droppedScore = flood[flood.length - 1].score;
    expect(scores).not.toContain(droppedScore);
  });

  it('still filters out chunks below the minimum similarity score', async () => {
    mockQuery.mockResolvedValue([
      { id: 'good', score: 0.8, metadata: { sourceType: 'policy' } },
      { id: 'noise', score: 0.1, metadata: { sourceType: 'policy' } },
    ]);

    const results = await findSimilarContent('q', 'org_test');

    expect(results.map((r) => r.id)).toEqual(['good']);
  });
});

describe('findSimilarContentBatch: result cap (CS-594)', () => {
  it('caps each question to a small, relevant set instead of every above-threshold chunk', async () => {
    const flood = buildDistinctPolicyResults(24);
    mockBatchEmbed.mockResolvedValue([[0.1, 0.2, 0.3]]);
    mockQuery.mockResolvedValue(flood);

    const [perQuestion] = await findSimilarContentBatch(
      ['Where is the business located?'],
      'org_test',
    );

    expect(perQuestion.length).toBeLessThan(flood.length);
    expect(perQuestion.length).toBeLessThanOrEqual(10);
    expect(perQuestion.length).toBeGreaterThan(0);
    // Highest-scoring chunk preserved.
    expect(perQuestion[0].score).toBe(0.9);
  });
});

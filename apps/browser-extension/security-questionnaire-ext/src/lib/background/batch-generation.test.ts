import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestionQueueItem, QueueStatus, TabQuestionQueue } from '../types';

const generateAnswer = vi.fn();
vi.mock('../api', () => ({
  generateAnswer: (...args: unknown[]) => generateAnswer(...args),
}));

const { generateQueueItemsInBatches } = await import('./batch-generation');

function item(overrides: Partial<QuestionQueueItem> & { id: string }): QuestionQueueItem {
  return {
    fieldId: overrides.id,
    question: `Question ${overrides.id}`,
    value: '',
    isEmpty: true,
    tag: 'textarea',
    status: 'pending',
    answer: null,
    confidence: null,
    sources: [],
    edited: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function queueWith(items: QuestionQueueItem[]): TabQuestionQueue {
  return {
    tabId: 1,
    url: 'https://vendor.example/security',
    host: 'vendor.example',
    surface: 'generic',
    organizationId: 'org_a',
    items,
    updatedAt: 0,
  } as TabQuestionQueue;
}

async function runBatch(items: QuestionQueueItem[]): Promise<TabQuestionQueue> {
  return generateQueueItemsInBatches({
    auth: { selectedOrganizationId: 'org_a' },
    concurrency: 1,
    queue: queueWith(items),
    saveQueue: async () => undefined,
  });
}

function generatedIds(): string[] {
  return generateAnswer.mock.calls.map((call) => {
    const [params] = call as [{ question: string }];
    return params.question.replace('Question ', '');
  });
}

beforeEach(() => {
  generateAnswer.mockReset();
  generateAnswer.mockImplementation(async (params: { question: string }) => ({
    questionIndex: 0,
    question: params.question,
    answer: 'generated answer',
    sources: [],
  }));
});

describe('generateQueueItemsInBatches', () => {
  it('generates for pending, generated and flagged items', async () => {
    await runBatch([
      item({ id: 'a', status: 'pending' }),
      item({ id: 'b', status: 'generated', answer: 'old' }),
      item({ id: 'c', status: 'flagged' as QueueStatus }),
    ]);
    expect(generatedIds().sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not overwrite an answer the user edited', async () => {
    const result = await runBatch([
      item({ id: 'a', status: 'pending' }),
      item({ id: 'edited', status: 'generated', answer: 'my wording', edited: true }),
    ]);
    expect(generatedIds()).toEqual(['a']);
    expect(result.items.find((entry) => entry.id === 'edited')?.answer).toBe('my wording');
  });

  it('does not regenerate approved answers', async () => {
    const result = await runBatch([
      item({ id: 'a', status: 'pending' }),
      item({ id: 'approved', status: 'approved', answer: 'signed off' }),
    ]);
    expect(generatedIds()).toEqual(['a']);
    const approved = result.items.find((entry) => entry.id === 'approved');
    expect(approved?.status).toBe('approved');
    expect(approved?.answer).toBe('signed off');
  });

  it('skips already inserted items', async () => {
    await runBatch([item({ id: 'inserted', status: 'inserted', answer: 'done' })]);
    expect(generateAnswer).not.toHaveBeenCalled();
  });

  it('flags an item when generation fails instead of leaving it generating', async () => {
    generateAnswer.mockRejectedValueOnce(new Error('API is down'));
    const result = await runBatch([item({ id: 'a', status: 'pending' })]);
    const updated = result.items.find((entry) => entry.id === 'a');
    expect(updated?.status).toBe('flagged');
    expect(updated?.error).toBe('API is down');
  });
});

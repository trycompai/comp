import { describe, expect, it } from 'vitest';
import { buildAnswersClipboardText } from './answers-clipboard';
import type { QuestionQueueItem } from './types';

function item(overrides: Partial<QuestionQueueItem>): QuestionQueueItem {
  return {
    id: 'field-1',
    fieldId: 'field-1',
    question: 'Do you encrypt data at rest?',
    value: '',
    isEmpty: true,
    tag: 'textarea',
    status: 'generated',
    answer: 'Yes.',
    confidence: 'high',
    sources: [],
    edited: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('buildAnswersClipboardText', () => {
  it('pairs each question with its answer', () => {
    const text = buildAnswersClipboardText([
      item({ id: 'a', question: 'Q1', answer: 'A1' }),
      item({ id: 'b', question: 'Q2', answer: 'A2' }),
    ]);
    expect(text).toBe('Q1\nA1\n\nQ2\nA2');
  });

  it('skips items with no answer yet', () => {
    const text = buildAnswersClipboardText([
      item({ id: 'a', question: 'Q1', answer: null, status: 'pending' }),
      item({ id: 'b', question: 'Q2', answer: '   ' }),
      item({ id: 'c', question: 'Q3', answer: 'A3' }),
    ]);
    expect(text).toBe('Q3\nA3');
  });

  it('returns an empty string when nothing is generated', () => {
    expect(buildAnswersClipboardText([])).toBe('');
  });
});

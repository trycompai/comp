import { describe, expect, it } from 'vitest';
import {
  approveGeneratedItems,
  approveHighConfidenceItems,
} from './queue-approval';
import {
  applyGeneratedAnswer,
  syncDetectedQuestions,
} from './queue';
import type { DetectedQuestion, TabQuestionQueue } from './types';

const firstQuestion: DetectedQuestion = {
  id: 'field-1',
  question: 'Do you encrypt customer data at rest?',
  value: '',
  isEmpty: true,
  tag: 'textarea',
};

const secondQuestion: DetectedQuestion = {
  id: 'field-2',
  question: 'Do you support SSO?',
  value: '',
  isEmpty: true,
  tag: 'textarea',
};

describe('queue approval reducers', () => {
  it('approves all generated answers with text', () => {
    const queue = withGeneratedAnswers();

    const approved = approveGeneratedItems(queue);

    expect(approved.items.map((item) => item.status)).toEqual([
      'approved',
      'approved',
    ]);
  });

  it('keeps high-confidence approval scoped to high-confidence answers', () => {
    const queue = withGeneratedAnswers();

    const approved = approveHighConfidenceItems(queue);

    expect(approved.items.map((item) => item.status)).toEqual([
      'approved',
      'generated',
    ]);
  });
});

function withGeneratedAnswers(): TabQuestionQueue {
  const queue = syncDetectedQuestions({
    queue: null,
    tabId: 1,
    url: 'https://vendor.example/security',
    host: 'vendor.example',
    surface: 'generic',
    organizationId: 'org_a',
    questions: [firstQuestion, secondQuestion],
  });
  return applyGeneratedAnswer({
    queue: applyGeneratedAnswer({
      queue,
      itemId: 'field-1',
      answer: {
        questionIndex: 0,
        question: firstQuestion.question,
        answer: 'Yes.',
        sources: ['a', 'b'],
      },
    }),
    itemId: 'field-2',
    answer: {
      questionIndex: 1,
      question: secondQuestion.question,
      answer: 'Yes, SSO is supported.',
      sources: ['a'],
    },
  });
}

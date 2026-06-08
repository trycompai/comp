import { describe, expect, it } from 'vitest';
import {
  applyGeneratedAnswer,
  approveQueueItem,
  editQueueItem,
  markQueueItemsInserted,
  setQueueOrganization,
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

function queueWithQuestions(): TabQuestionQueue {
  return syncDetectedQuestions({
    queue: null,
    tabId: 1,
    url: 'https://vendor.example/security',
    host: 'vendor.example',
    surface: 'generic',
    organizationId: 'org_a',
    questions: [firstQuestion, secondQuestion],
  });
}

describe('queue reducer', () => {
  it('preserves generated answers while syncing detected fields', () => {
    const queue = applyGeneratedAnswer({
      queue: queueWithQuestions(),
      itemId: 'field-1',
      answer: {
        questionIndex: 0,
        question: firstQuestion.question,
        answer: 'Yes, customer data is encrypted at rest.',
        sources: ['source-a'],
      },
    });

    const synced = syncDetectedQuestions({
      queue,
      tabId: 1,
      url: 'https://vendor.example/security',
      host: 'vendor.example',
      surface: 'generic',
      organizationId: 'org_a',
      questions: [{ ...firstQuestion, value: 'draft' }, secondQuestion],
    });

    expect(synced.items[0].status).toBe('generated');
    expect(synced.items[0].answer).toBe('Yes, customer data is encrypted at rest.');
    expect(synced.items[0].value).toBe('draft');
  });

  it('keeps inserted answers but clears uninserted drafts on org switch', () => {
    const generated = applyGeneratedAnswer({
      queue: queueWithQuestions(),
      itemId: 'field-1',
      answer: {
        questionIndex: 0,
        question: firstQuestion.question,
        answer: 'Yes.',
        sources: ['source-a', 'source-b'],
      },
    });
    const approved = approveQueueItem({ queue: generated, itemId: 'field-1' });
    const inserted = markQueueItemsInserted({
      queue: approved,
      itemIds: ['field-1'],
    });
    const withDraft = applyGeneratedAnswer({
      queue: inserted,
      itemId: 'field-2',
      answer: {
        questionIndex: 1,
        question: secondQuestion.question,
        answer: 'Yes, SSO is supported.',
        sources: ['source-c'],
      },
    });

    const switched = setQueueOrganization({
      queue: withDraft,
      organizationId: 'org_b',
    });

    expect(switched.items[0].status).toBe('inserted');
    expect(switched.items[0].answer).toBe('Yes.');
    expect(switched.items[1].status).toBe('pending');
    expect(switched.items[1].answer).toBeNull();
    expect(switched.staleDraftCount).toBe(1);
  });

  it('keeps approved answers approved when edited', () => {
    const generated = applyGeneratedAnswer({
      queue: queueWithQuestions(),
      itemId: 'field-1',
      answer: {
        questionIndex: 0,
        question: firstQuestion.question,
        answer: 'Yes.',
        sources: ['source-a'],
      },
    });
    const approved = approveQueueItem({ queue: generated, itemId: 'field-1' });

    const edited = editQueueItem({
      queue: approved,
      itemId: 'field-1',
      answer: 'Yes, data is encrypted at rest.',
    });

    expect(edited.items[0].status).toBe('approved');
    expect(edited.items[0].answer).toBe('Yes, data is encrypted at rest.');
  });
});

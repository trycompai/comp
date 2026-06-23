import type { QuestionQueueItem, TabQuestionQueue } from './types';

export function approveGeneratedItems(queue: TabQuestionQueue): TabQuestionQueue {
  return approveMatchingGeneratedItems({
    queue,
    matches: (item) => Boolean(item.answer),
  });
}

export function approveHighConfidenceItems(
  queue: TabQuestionQueue,
): TabQuestionQueue {
  return approveMatchingGeneratedItems({
    queue,
    matches: (item) => item.confidence === 'high' && Boolean(item.answer),
  });
}

function approveMatchingGeneratedItems(params: {
  queue: TabQuestionQueue;
  matches(item: QuestionQueueItem): boolean;
}): TabQuestionQueue {
  const now = Date.now();
  return {
    ...params.queue,
    items: params.queue.items.map((item) =>
      item.status === 'generated' && params.matches(item)
        ? { ...item, status: 'approved', updatedAt: now }
        : item,
    ),
    updatedAt: now,
  };
}

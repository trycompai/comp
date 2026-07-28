import type { QuestionQueueItem, TabQuestionQueue } from './types';

function hasAnswerText(item: QuestionQueueItem): boolean {
  return (item.answer?.trim().length ?? 0) > 0;
}

export function approveGeneratedItems(queue: TabQuestionQueue): TabQuestionQueue {
  return approveMatchingGeneratedItems({
    queue,
    matches: hasAnswerText,
  });
}

export function approveHighConfidenceItems(
  queue: TabQuestionQueue,
): TabQuestionQueue {
  return approveMatchingGeneratedItems({
    queue,
    matches: (item) => item.confidence === 'high' && hasAnswerText(item),
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

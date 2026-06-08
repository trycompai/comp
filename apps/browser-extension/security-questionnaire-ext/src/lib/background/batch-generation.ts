import { generateAnswer } from '../api';
import { runConcurrent } from '../async-pool';
import {
  applyGeneratedAnswer,
  updateQueueItemStatus,
} from '../queue';
import type {
  GeneratedAnswer,
  QuestionQueueItem,
  TabQuestionQueue,
} from '../types';

const DEFAULT_GENERATE_CONCURRENCY = 4;

export async function generateQueueItemsInBatches(params: {
  auth: { selectedOrganizationId: string };
  concurrency?: number;
  queue: TabQuestionQueue;
  saveQueue(queue: TabQuestionQueue): Promise<void>;
}): Promise<TabQuestionQueue> {
  const candidates = params.queue.items.filter(
    (item) => item.status !== 'inserted' && item.status !== 'generating',
  );
  if (candidates.length === 0) return params.queue;

  let queue = markCandidatesGenerating({
    candidates,
    queue: params.queue,
  });
  await params.saveQueue(queue);

  let writeQueue: Promise<void> = Promise.resolve();
  const indexedItems = queue.items;
  await runConcurrent({
    concurrency: params.concurrency ?? DEFAULT_GENERATE_CONCURRENCY,
    items: candidates,
    run: async (item) => {
      const questionIndex = indexedItems.findIndex((entry) => entry.id === item.id);
      const answer = await generateAnswerSafely({
        auth: params.auth,
        item,
        questionIndex,
        totalQuestions: indexedItems.length,
      });
      queue = applyGeneratedAnswer({ queue, itemId: item.id, answer });
      const snapshot = queue;
      writeQueue = writeQueue.then(() => params.saveQueue(snapshot));
      await writeQueue;
    },
  });
  await writeQueue;
  return queue;
}

function markCandidatesGenerating(params: {
  candidates: QuestionQueueItem[];
  queue: TabQuestionQueue;
}): TabQuestionQueue {
  return params.candidates.reduce(
    (queue, item) => updateQueueItemStatus({
      queue,
      itemId: item.id,
      status: 'generating',
    }),
    params.queue,
  );
}

async function generateAnswerSafely(params: {
  auth: { selectedOrganizationId: string };
  item: QuestionQueueItem;
  questionIndex: number;
  totalQuestions: number;
}): Promise<GeneratedAnswer> {
  try {
    return await generateAnswer({
      organizationId: params.auth.selectedOrganizationId,
      question: params.item.question,
      questionIndex: params.questionIndex,
      totalQuestions: params.totalQuestions,
    });
  } catch (error) {
    return {
      questionIndex: params.questionIndex,
      question: params.item.question,
      answer: null,
      sources: [],
      error: error instanceof Error ? error.message : 'Unable to generate answer.',
    };
  }
}

import { generateAnswer } from '../api';
import { runConcurrent } from '../async-pool';
import {
  applyGeneratedAnswer,
  updateQueueItemStatus,
} from '../queue';
import type {
  GeneratedAnswer,
  QuestionQueueItem,
  QueueStatus,
  TabQuestionQueue,
} from '../types';

const DEFAULT_GENERATE_CONCURRENCY = 4;

// Generate-all must not overwrite work the user already curated: approved
// answers and manual edits are only replaced by an explicit single regenerate.
const SKIPPED_BATCH_STATUSES = new Set<QueueStatus>([
  'inserted',
  'generating',
  'approved',
]);

function isBatchCandidate(item: QuestionQueueItem): boolean {
  if (SKIPPED_BATCH_STATUSES.has(item.status)) return false;
  return !item.edited;
}

export async function generateQueueItemsInBatches(params: {
  auth: { selectedOrganizationId: string };
  concurrency?: number;
  queue: TabQuestionQueue;
  loadQueue?: () => Promise<TabQuestionQueue>;
  saveQueue(queue: TabQuestionQueue): Promise<void>;
}): Promise<TabQuestionQueue> {
  const candidates = params.queue.items.filter(isBatchCandidate);
  if (candidates.length === 0) return params.queue;

  let queue = markCandidatesGenerating({
    candidates,
    queue: params.queue,
  });
  await params.saveQueue(queue);

  const indexedItems = queue.items;
  // Generation is slow and the user keeps editing and approving while it runs.
  // Each result is applied to the freshly stored queue inside a serialized
  // section, so a long-running request cannot write back a stale snapshot.
  let writeQueue: Promise<void> = Promise.resolve();
  const commit = (
    apply: (current: TabQuestionQueue) => TabQuestionQueue,
  ): Promise<void> => {
    writeQueue = writeQueue.then(async () => {
      const current = params.loadQueue ? await params.loadQueue() : queue;
      queue = apply(current);
      await params.saveQueue(queue);
    });
    return writeQueue;
  };

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
      await commit((current) => {
        const existing = current.items.find((entry) => entry.id === item.id);
        // We marked this item `generating`. If it no longer is, the user
        // edited or approved it while the request was in flight — their
        // version wins over the answer we just received.
        if (existing && (existing.status !== 'generating' || existing.edited)) {
          return current;
        }
        return applyGeneratedAnswer({ queue: current, itemId: item.id, answer });
      });
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

import { browser } from 'wxt/browser';
import { generateAnswer } from '../api';
import {
  applyGeneratedAnswer,
  approveQueueItem,
  editQueueItem,
  getApprovedInsertRequests,
  markQueueItemsInserted,
  selectQueueItem,
  setQueueOrganization,
  updateQueueItemStatus,
} from '../queue';
import {
  approveGeneratedItems,
  approveHighConfidenceItems,
} from '../queue-approval';
import { isDomainConfirmed } from '../storage';
import type {
  AuthState,
  DomainConfirmationRequest,
  GeneratedAnswer,
  TabQuestionQueue,
} from '../types';
import type { BackgroundRequest, BackgroundResponse } from '../messaging';
import { ensureActiveOrganization } from './auth';
import { generateQueueItemsInBatches } from './batch-generation';
import { insertAnswersIntoTab } from './insert-answers';
import { loadTabQueue, saveTabQueue } from './queue-store';
import {
  insertSheetAnswersWithApi,
  prepareSheetPaste,
} from './sheet-actions';

const UPDATE_MESSAGE = 'comp:queue-updated';

export async function handleQueueAction(
  request: BackgroundRequest,
): Promise<BackgroundResponse> {
  if (request.type === 'comp:generate-queue-item') {
    return generateQueueItem(request.tabId, request.itemId);
  }
  if (request.type === 'comp:generate-all') return generateAll(request.tabId);
  if (request.type === 'comp:approve-queue-item') {
    return updateAndReturn(approveQueueItem({
      queue: await requireQueue(request.tabId),
      itemId: request.itemId,
    }));
  }
  if (request.type === 'comp:approve-high-confidence') {
    return updateAndReturn(approveHighConfidenceItems(await requireQueue(request.tabId)));
  }
  if (request.type === 'comp:approve-all-generated') {
    return updateAndReturn(approveGeneratedItems(await requireQueue(request.tabId)));
  }
  if (request.type === 'comp:edit-queue-item') {
    return updateAndReturn(editQueueItem({
      queue: await requireQueue(request.tabId),
      itemId: request.itemId,
      answer: request.answer,
    }));
  }
  if (request.type === 'comp:select-queue-item') {
    return updateAndReturn(selectQueueItem({
      queue: await requireQueue(request.tabId),
      itemId: request.itemId,
    }));
  }
  if (request.type === 'comp:insert-approved') return insertApproved(request.tabId);
  if (request.type === 'comp:insert-queue-item') {
    return insertSingle(request.tabId, request.itemId);
  }
  if (request.type === 'comp:prepare-sheet-paste') {
    return prepareSheetPaste(request.tabId, request.itemId);
  }
  if (request.type === 'comp:insert-sheet-api') {
    return insertSheetAnswersWithApi(request.tabId, request.itemId);
  }
  if (request.type === 'comp:mark-sheet-paste-inserted') {
    return updateAndReturn(markQueueItemsInserted({
      queue: await requireQueue(request.tabId),
      itemIds: request.itemIds,
    }));
  }
  throw new Error('Unsupported request.');
}

export async function generateLegacyAnswer(
  request: Extract<BackgroundRequest, { type: 'comp:generate-answer' }>,
): Promise<BackgroundResponse> {
  const auth = await ensureActiveOrganization();
  return {
    ok: true,
    answer: await generateAnswerForItem({
      auth,
      question: request.question,
      questionIndex: request.questionIndex,
      totalQuestions: request.totalQuestions,
    }),
  };
}

export async function saveQueueAndNotify(queue: TabQuestionQueue): Promise<void> {
  await saveTabQueue(queue);
  await browser.runtime
    .sendMessage({ type: UPDATE_MESSAGE, tabId: queue.tabId })
    .catch(() => undefined);
}

async function generateQueueItem(
  tabId: number,
  itemId: string,
): Promise<BackgroundResponse> {
  const auth = await ensureActiveOrganization();
  const queue = setQueueOrganization({
    queue: await requireQueue(tabId),
    organizationId: auth.selectedOrganizationId,
  });
  const confirmation = await getDomainConfirmation({ auth, queue });
  if (confirmation) return { ok: false, confirmation };

  const item = queue.items.find((entry) => entry.id === itemId);
  if (!item) throw new Error('Question not found on this page.');

  await saveQueueAndNotify(updateQueueItemStatus({ queue, itemId, status: 'generating' }));
  const answer = await generateAnswerForItem({
    auth,
    question: item.question,
    questionIndex: queue.items.findIndex((entry) => entry.id === itemId),
    totalQuestions: queue.items.length,
  });
  const updated = applyGeneratedAnswer({
    queue: await requireQueue(tabId),
    itemId,
    answer,
  });
  await saveQueueAndNotify(updated);
  const updatedItem = updated.items.find((entry) => entry.id === itemId);
  if (!updatedItem) throw new Error('Generated item was not found.');
  return { ok: true, item: updatedItem, queue: updated };
}

async function generateAll(tabId: number): Promise<BackgroundResponse> {
  const auth = await ensureActiveOrganization();
  const queue = setQueueOrganization({
    queue: await requireQueue(tabId),
    organizationId: auth.selectedOrganizationId,
  });
  const confirmation = await getDomainConfirmation({ auth, queue });
  if (confirmation) return { ok: false, confirmation };

  const updated = await generateQueueItemsInBatches({
    auth,
    queue,
    saveQueue: saveQueueAndNotify,
  });
  return { ok: true, count: updated.items.length, queue: updated };
}

async function insertApproved(tabId: number): Promise<BackgroundResponse> {
  const queue = await requireQueue(tabId);
  const confirmation = await getInsertConfirmation(queue);
  if (confirmation) return { ok: false, confirmation };

  const requests = getApprovedInsertRequests(queue);
  const insertedFieldIds = await insertAnswersIntoTab({
    tabId,
    answers: requests.answers,
  });
  const insertedItemIds = queue.items
    .filter((item) => insertedFieldIds.includes(item.fieldId))
    .map((item) => item.id);
  const updated = markQueueItemsInserted({ queue, itemIds: insertedItemIds });
  await saveQueueAndNotify(updated);
  return { ok: true, count: insertedItemIds.length, queue: updated };
}

async function insertSingle(
  tabId: number,
  itemId: string,
): Promise<BackgroundResponse> {
  const queue = await requireQueue(tabId);
  const item = queue.items.find((entry) => entry.id === itemId);
  if (!item?.answer) throw new Error('No answer is ready to insert.');
  const confirmation = await getInsertConfirmation(queue);
  if (confirmation) return { ok: false, confirmation };

  const insertedFieldIds = await insertAnswersIntoTab({
    tabId,
    answers: [{ fieldId: item.fieldId, answer: item.answer }],
  });
  const updated = markQueueItemsInserted({
    queue,
    itemIds: insertedFieldIds.includes(item.fieldId) ? [item.id] : [],
  });
  await saveQueueAndNotify(updated);
  return { ok: true, count: insertedFieldIds.length, queue: updated };
}

async function requireQueue(tabId: number): Promise<TabQuestionQueue> {
  const queue = await loadTabQueue(tabId);
  if (!queue) throw new Error('Scan the page before generating answers.');
  return queue;
}

async function generateAnswerForItem(params: {
  auth: { selectedOrganizationId: string };
  question: string;
  questionIndex: number;
  totalQuestions: number;
}): Promise<GeneratedAnswer> {
  return generateAnswer({
    organizationId: params.auth.selectedOrganizationId,
    question: params.question,
    questionIndex: params.questionIndex,
    totalQuestions: params.totalQuestions,
  });
}

async function getInsertConfirmation(
  queue: TabQuestionQueue,
): Promise<DomainConfirmationRequest | null> {
  const auth = await ensureActiveOrganization();
  return getDomainConfirmation({ auth, queue });
}

async function getDomainConfirmation(params: {
  auth: { selectedOrganizationId: string; organizations: AuthState['organizations'] };
  queue: TabQuestionQueue;
}): Promise<DomainConfirmationRequest | null> {
  const confirmed = await isDomainConfirmed({
    host: params.queue.host,
    organizationId: params.auth.selectedOrganizationId,
  });
  if (confirmed) return null;

  const org = params.auth.organizations.find(
    (entry) => entry.id === params.auth.selectedOrganizationId,
  );
  return {
    host: params.queue.host,
    organizationId: params.auth.selectedOrganizationId,
    organizationName: org?.name ?? 'selected organization',
  };
}

async function updateAndReturn(queue: TabQuestionQueue): Promise<BackgroundResponse> {
  await saveQueueAndNotify(queue);
  return { ok: true, queue };
}

import { browser } from 'wxt/browser';
import {
  getApprovedInsertRequests,
  markQueueItemsInserted,
} from '../queue';
import { buildSheetPastePlan } from '../sheets-paste-plan';
import { isDomainConfirmed } from '../storage';
import type {
  DomainConfirmationRequest,
  TabQuestionQueue,
} from '../types';
import type { BackgroundResponse } from '../messaging';
import { ensureActiveOrganization } from './auth';
import { insertAnswersWithGoogleSheetsApi } from './google-sheets-api';
import { loadTabQueue, saveTabQueue } from './queue-store';

const UPDATE_MESSAGE = 'comp:queue-updated';

export async function prepareSheetPaste(
  tabId: number,
  itemId?: string,
): Promise<BackgroundResponse> {
  const queue = await requireSheetQueue(tabId);
  const confirmation = await getInsertConfirmation(queue);
  if (confirmation) return { ok: false, confirmation };

  const requests = getSheetInsertRequests({ queue, itemId });
  const plan = buildSheetPastePlan(requests.answers);
  if (!plan) throw new Error('No mapped sheet answers are ready to paste.');

  const itemIds = queue.items
    .filter((item) => plan.targetIds.includes(item.fieldId))
    .map((item) => item.id);
  return { ok: true, sheetPaste: { ...plan, itemIds } };
}

export async function insertSheetAnswersWithApi(
  tabId: number,
  itemId?: string,
): Promise<BackgroundResponse> {
  const queue = await requireSheetQueue(tabId);
  const confirmation = await getInsertConfirmation(queue);
  if (confirmation) return { ok: false, confirmation };

  const requests = getSheetInsertRequests({ queue, itemId });
  const insertedFieldIds = await insertAnswersWithGoogleSheetsApi({
    queue,
    answers: requests.answers,
  });
  const insertedItemIds = queue.items
    .filter((item) => insertedFieldIds.includes(item.fieldId))
    .map((item) => item.id);
  const updated = markQueueItemsInserted({
    queue,
    itemIds: insertedItemIds,
  });
  await saveQueueAndNotify(updated);
  return { ok: true, count: insertedItemIds.length, queue: updated };
}

function getSheetInsertRequests(params: {
  queue: TabQuestionQueue;
  itemId?: string;
}): {
  itemIds: string[];
  answers: { fieldId: string; answer: string }[];
} {
  if (!params.itemId) return getApprovedInsertRequests(params.queue);
  const item = params.queue.items.find((entry) => entry.id === params.itemId);
  if (!item?.answer) throw new Error('No answer is ready to insert.');
  return {
    itemIds: [item.id],
    answers: [{ fieldId: item.fieldId, answer: item.answer }],
  };
}

async function requireSheetQueue(tabId: number): Promise<TabQuestionQueue> {
  const queue = await loadTabQueue(tabId);
  if (!queue) throw new Error('Scan the page before inserting answers.');
  if (queue.surface !== 'sheets') throw new Error('Open a Google Sheet first.');
  return queue;
}

async function getInsertConfirmation(
  queue: TabQuestionQueue,
): Promise<DomainConfirmationRequest | null> {
  const auth = await ensureActiveOrganization();
  const confirmed = await isDomainConfirmed({
    host: queue.host,
    organizationId: auth.selectedOrganizationId,
  });
  if (confirmed) return null;

  const org = auth.organizations.find(
    (entry) => entry.id === auth.selectedOrganizationId,
  );
  return {
    host: queue.host,
    organizationId: auth.selectedOrganizationId,
    organizationName: org?.name ?? 'selected organization',
  };
}

async function saveQueueAndNotify(queue: TabQuestionQueue): Promise<void> {
  await saveTabQueue(queue);
  await browser.runtime
    .sendMessage({ type: UPDATE_MESSAGE, tabId: queue.tabId })
    .catch(() => undefined);
}

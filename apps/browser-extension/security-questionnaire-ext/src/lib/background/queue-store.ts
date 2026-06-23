import { z } from 'zod';
import { browser } from 'wxt/browser';
import type { TabQuestionQueue } from '../types';

const QUEUE_KEY_PREFIX = 'comp.securityQuestionnaire.queue.';

const QueueItemSchema = z.object({
  id: z.string(),
  fieldId: z.string(),
  question: z.string(),
  value: z.string(),
  isEmpty: z.boolean(),
  tag: z.string(),
  status: z.enum([
    'pending',
    'generating',
    'generated',
    'approved',
    'inserted',
    'flagged',
  ]),
  answer: z.string().nullable(),
  confidence: z.enum(['high', 'med', 'low']).nullable(),
  sources: z.array(z.unknown()),
  error: z.string().optional(),
  edited: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const SheetMappingSchema = z.object({
  spreadsheetId: z.string(),
  gid: z.string(),
  questionColumn: z.string(),
  answerColumn: z.string(),
  startRow: z.number(),
  endRow: z.number().nullable(),
  source: z.enum(['auto', 'manual']),
  confirmed: z.boolean(),
  updatedAt: z.number(),
});

const TabQuestionQueueSchema = z.object({
  tabId: z.number(),
  url: z.string(),
  host: z.string(),
  surface: z.enum(['generic', 'docs', 'sheets', 'forms']),
  sheetMapping: SheetMappingSchema.nullable().default(null),
  organizationId: z.string().nullable(),
  selectedItemId: z.string().nullable(),
  staleDraftCount: z.number(),
  items: z.array(QueueItemSchema),
  updatedAt: z.number(),
});

export async function loadTabQueue(
  tabId: number,
): Promise<TabQuestionQueue | null> {
  const key = getQueueKey(tabId);
  const result = await browser.storage.session.get(key);
  const parsed = TabQuestionQueueSchema.safeParse(result[key]);
  return parsed.success ? parsed.data : null;
}

export async function saveTabQueue(queue: TabQuestionQueue): Promise<void> {
  await browser.storage.session.set({ [getQueueKey(queue.tabId)]: queue });
}

export async function clearTabQueue(tabId: number): Promise<void> {
  await browser.storage.session.remove(getQueueKey(tabId));
}

function getQueueKey(tabId: number): string {
  return `${QUEUE_KEY_PREFIX}${tabId}`;
}

import type {
  AnswerConfidence,
  DetectedQuestion,
  GeneratedAnswer,
  QuestionQueueItem,
  QuestionnaireSurface,
  QueueStatus,
  SheetMapping,
  TabQuestionQueue,
} from './types';

const DRAFT_STATUSES = new Set<QueueStatus>([
  'generating',
  'generated',
  'approved',
  'flagged',
]);

export function createEmptyQueue(params: {
  tabId: number;
  url: string;
  host: string;
  surface: QuestionnaireSurface;
  organizationId: string | null;
}): TabQuestionQueue {
  return {
    tabId: params.tabId,
    url: params.url,
    host: params.host,
    surface: params.surface,
    sheetMapping: null,
    organizationId: params.organizationId,
    selectedItemId: null,
    staleDraftCount: 0,
    items: [],
    updatedAt: Date.now(),
  };
}

export function syncDetectedQuestions(params: {
  queue: TabQuestionQueue | null;
  tabId: number;
  url: string;
  host: string;
  surface: QuestionnaireSurface;
  sheetMapping?: SheetMapping | null;
  organizationId: string | null;
  questions: DetectedQuestion[];
}): TabQuestionQueue {
  const now = Date.now();
  const existing = params.queue?.items ?? [];
  const items = params.questions.map((question) => {
    const current = existing.find((item) => item.fieldId === question.id);
    if (current && current.question === question.question) {
      return {
        ...current,
        value: question.value,
        isEmpty: question.isEmpty,
        tag: question.tag,
        updatedAt: now,
      };
    }

    return createPendingItem({ question, now });
  });

  const selectedItemId =
    items.find((item) => item.id === params.queue?.selectedItemId)?.id ??
    items[0]?.id ??
    null;
  const sheetMapping = params.surface === 'sheets'
    ? params.sheetMapping ?? params.queue?.sheetMapping ?? null
    : null;

  return {
    tabId: params.tabId,
    url: params.url,
    host: params.host,
    surface: params.surface,
    sheetMapping,
    organizationId: params.organizationId,
    selectedItemId,
    staleDraftCount: params.queue?.staleDraftCount ?? 0,
    items,
    updatedAt: now,
  };
}

export function setQueueOrganization(params: {
  queue: TabQuestionQueue;
  organizationId: string | null;
}): TabQuestionQueue {
  if (params.queue.organizationId === params.organizationId) {
    return { ...params.queue, updatedAt: Date.now() };
  }

  const now = Date.now();
  let staleDraftCount = 0;
  const items = params.queue.items.map((item) => {
    if (!DRAFT_STATUSES.has(item.status)) return item;
    staleDraftCount += 1;
    return resetDraftItem({ item, now });
  });

  return {
    ...params.queue,
    organizationId: params.organizationId,
    staleDraftCount,
    items,
    updatedAt: now,
  };
}

export function updateQueueItemStatus(params: {
  queue: TabQuestionQueue;
  itemId: string;
  status: QueueStatus;
}): TabQuestionQueue {
  return updateItem(params.queue, params.itemId, (item, now) => ({
    ...item,
    status: params.status,
    updatedAt: now,
  }));
}

export function applyGeneratedAnswer(params: {
  queue: TabQuestionQueue;
  itemId: string;
  answer: GeneratedAnswer;
}): TabQuestionQueue {
  return updateItem(params.queue, params.itemId, (item, now) => {
    const answer = params.answer.answer;
    const hasAnswer = typeof answer === 'string' && answer.trim().length > 0;
    return {
      ...item,
      status: hasAnswer ? 'generated' : 'flagged',
      answer: hasAnswer ? answer : null,
      confidence: hasAnswer ? getAnswerConfidence(params.answer) : 'low',
      sources: params.answer.sources,
      error: params.answer.error ?? undefined,
      updatedAt: now,
    };
  });
}

export function approveQueueItem(params: {
  queue: TabQuestionQueue;
  itemId: string;
}): TabQuestionQueue {
  return updateItem(params.queue, params.itemId, (item, now) => {
    if (item.status !== 'generated' || !item.answer) return item;
    return { ...item, status: 'approved', updatedAt: now };
  });
}

export function editQueueItem(params: {
  queue: TabQuestionQueue;
  itemId: string;
  answer: string;
}): TabQuestionQueue {
  return updateItem(params.queue, params.itemId, (item, now) => ({
    ...item,
    status: item.status === 'approved' ? 'approved' : 'generated',
    answer: params.answer,
    confidence: item.confidence ?? 'med',
    edited: true,
    error: undefined,
    updatedAt: now,
  }));
}

export function markQueueItemsInserted(params: {
  queue: TabQuestionQueue;
  itemIds: string[];
}): TabQuestionQueue {
  const now = Date.now();
  const insertedIds = new Set(params.itemIds);
  return {
    ...params.queue,
    items: params.queue.items.map((item) =>
      insertedIds.has(item.id)
        ? { ...item, status: 'inserted', updatedAt: now }
        : item,
    ),
    updatedAt: now,
  };
}

export function selectQueueItem(params: {
  queue: TabQuestionQueue;
  itemId: string;
}): TabQuestionQueue {
  return {
    ...params.queue,
    selectedItemId: params.itemId,
    updatedAt: Date.now(),
  };
}

export function getApprovedInsertRequests(queue: TabQuestionQueue): {
  itemIds: string[];
  answers: { fieldId: string; answer: string }[];
} {
  const approved = queue.items.filter(
    (item) => item.status === 'approved' && Boolean(item.answer),
  );
  return {
    itemIds: approved.map((item) => item.id),
    answers: approved.flatMap((item) =>
      item.answer ? [{ fieldId: item.fieldId, answer: item.answer }] : [],
    ),
  };
}

function createPendingItem(params: {
  question: DetectedQuestion;
  now: number;
}): QuestionQueueItem {
  return {
    id: params.question.id,
    fieldId: params.question.id,
    question: params.question.question,
    value: params.question.value,
    isEmpty: params.question.isEmpty,
    tag: params.question.tag,
    status: 'pending',
    answer: null,
    confidence: null,
    sources: [],
    edited: false,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

function resetDraftItem(params: {
  item: QuestionQueueItem;
  now: number;
}): QuestionQueueItem {
  return {
    ...params.item,
    status: 'pending',
    answer: null,
    confidence: null,
    sources: [],
    error: undefined,
    edited: false,
    updatedAt: params.now,
  };
}

function updateItem(
  queue: TabQuestionQueue,
  itemId: string,
  updater: (item: QuestionQueueItem, now: number) => QuestionQueueItem,
): TabQuestionQueue {
  const now = Date.now();
  return {
    ...queue,
    items: queue.items.map((item) =>
      item.id === itemId ? updater(item, now) : item,
    ),
    selectedItemId: itemId,
    updatedAt: now,
  };
}

function getAnswerConfidence(answer: GeneratedAnswer): AnswerConfidence {
  if (answer.sources.length >= 2) return 'high';
  if (answer.sources.length === 1) return 'med';
  return 'low';
}

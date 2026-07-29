import type {
  AuthState,
  DetectedQuestion,
  DomainConfirmationRequest,
  GeneratedAnswer,
  PanelState,
  QuestionQueueItem,
  QuestionnaireSurface,
  ScanDebug,
  SheetMapping,
  TabQuestionQueue,
} from './types';
import type { SheetPastePayload } from './sheets-paste-plan';
import {
  isQuestionnaireSurface,
  isRecord,
  parseDetectedQuestion,
} from './message-utils';
import { parseSheetMapping } from './sheet-mapping';
export {
  parseContentRequest,
  type ContentRequest,
  type ContentResponse,
} from './content-messaging';

export type BackgroundRequest =
  | { type: 'comp:get-auth-state' }
  | { type: 'comp:get-panel-state'; tabId: number; url?: string; host?: string }
  | { type: 'comp:open-sign-in' }
  | { type: 'comp:open-side-panel'; tabId: number; windowId?: number }
  | { type: 'comp:set-active-org'; organizationId: string }
  | { type: 'comp:set-active-org'; organizationId: string; tabId: number }
  | { type: 'comp:confirm-domain'; host: string; organizationId: string }
  | { type: 'comp:set-detection-enabled'; host: string; enabled: boolean }
  | { type: 'comp:detect-sheet-questions'; pathname: string; hash: string }
  | { type: 'comp:set-sheet-mapping'; mapping: SheetMapping }
  | {
      type: 'comp:sync-questions';
      tabId?: number;
      url: string;
      host: string;
      surface: QuestionnaireSurface;
      questions: DetectedQuestion[];
      sheetMapping?: SheetMapping | null;
    }
  | { type: 'comp:generate-queue-item'; tabId: number; itemId: string }
  | { type: 'comp:generate-all'; tabId: number }
  | { type: 'comp:approve-queue-item'; tabId: number; itemId: string }
  | { type: 'comp:approve-high-confidence'; tabId: number }
  | { type: 'comp:approve-all-generated'; tabId: number }
  | {
      type: 'comp:edit-queue-item';
      tabId: number;
      itemId: string;
      answer: string;
    }
  | { type: 'comp:select-queue-item'; tabId: number; itemId: string }
  | { type: 'comp:insert-approved'; tabId: number }
  | { type: 'comp:insert-queue-item'; tabId: number; itemId: string }
  | { type: 'comp:prepare-sheet-paste'; tabId: number; itemId?: string }
  | { type: 'comp:insert-sheet-api'; tabId: number; itemId?: string }
  | {
      type: 'comp:mark-sheet-paste-inserted';
      tabId: number;
      itemIds: string[];
    }
  | {
      type: 'comp:generate-answer';
      question: string;
      questionIndex: number;
      totalQuestions: number;
    };

export type BackgroundResponse =
  | { ok: true; state: AuthState }
  | { ok: true; panelState: PanelState }
  | { ok: true; answer: GeneratedAnswer }
  | {
      ok: true;
      questions: DetectedQuestion[];
      debug?: ScanDebug;
      mapping?: SheetMapping | null;
    }
  | { ok: true; queue: TabQuestionQueue }
  | { ok: true; item: QuestionQueueItem; queue: TabQuestionQueue }
  | { ok: true; sheetPaste: SheetPastePayload }
  | { ok: true; count: number; queue?: TabQuestionQueue }
  | { ok: true; staleDraftCount: number }
  | { ok: true }
  | { ok: false; confirmation: DomainConfirmationRequest }
  | { ok: false; error: string };

export function parseBackgroundRequest(
  value: unknown,
): BackgroundRequest | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  if (value.type === 'comp:get-auth-state') return { type: value.type };
  if (value.type === 'comp:open-sign-in') return { type: value.type };

  if (
    value.type === 'comp:get-panel-state' &&
    typeof value.tabId === 'number'
  ) {
    return {
      type: value.type,
      tabId: value.tabId,
      url: typeof value.url === 'string' ? value.url : undefined,
      host: typeof value.host === 'string' ? value.host : undefined,
    };
  }

  if (
    value.type === 'comp:open-side-panel' &&
    typeof value.tabId === 'number'
  ) {
    return {
      type: value.type,
      tabId: value.tabId,
      windowId: typeof value.windowId === 'number' ? value.windowId : undefined,
    };
  }

  if (
    value.type === 'comp:set-active-org' &&
    typeof value.organizationId === 'string'
  ) {
    if (typeof value.tabId === 'number') {
      return {
        type: value.type,
        organizationId: value.organizationId,
        tabId: value.tabId,
      };
    }
    return { type: value.type, organizationId: value.organizationId };
  }

  if (
    value.type === 'comp:confirm-domain' &&
    typeof value.host === 'string' &&
    typeof value.organizationId === 'string'
  ) {
    return {
      type: value.type,
      host: value.host,
      organizationId: value.organizationId,
    };
  }

  if (
    value.type === 'comp:set-detection-enabled' &&
    typeof value.host === 'string' &&
    typeof value.enabled === 'boolean'
  ) {
    return { type: value.type, host: value.host, enabled: value.enabled };
  }

  if (
    value.type === 'comp:detect-sheet-questions' &&
    typeof value.pathname === 'string' &&
    typeof value.hash === 'string'
  ) {
    return { type: value.type, pathname: value.pathname, hash: value.hash };
  }

  if (value.type === 'comp:set-sheet-mapping') {
    const mapping = parseSheetMapping(value.mapping);
    return mapping ? { type: value.type, mapping } : null;
  }

  if (value.type === 'comp:sync-questions') {
    return parseSyncQuestionsRequest(value);
  }

  const queueAction = parseQueueAction(value);
  if (queueAction) return queueAction;

  if (
    value.type === 'comp:edit-queue-item' &&
    typeof value.tabId === 'number' &&
    typeof value.itemId === 'string' &&
    typeof value.answer === 'string'
  ) {
    return {
      type: value.type,
      tabId: value.tabId,
      itemId: value.itemId,
      answer: value.answer,
    };
  }

  if (
    value.type === 'comp:mark-sheet-paste-inserted' &&
    typeof value.tabId === 'number' &&
    Array.isArray(value.itemIds)
  ) {
    return {
      type: value.type,
      tabId: value.tabId,
      itemIds: value.itemIds.filter((itemId) => typeof itemId === 'string'),
    };
  }

  if (
    value.type === 'comp:generate-answer' &&
    typeof value.question === 'string' &&
    typeof value.questionIndex === 'number' &&
    typeof value.totalQuestions === 'number'
  ) {
    return {
      type: value.type,
      question: value.question,
      questionIndex: value.questionIndex,
      totalQuestions: value.totalQuestions,
    };
  }

  return null;
}

function parseSyncQuestionsRequest(
  value: Record<string, unknown>,
): BackgroundRequest | null {
  if (
    typeof value.url !== 'string' ||
    typeof value.host !== 'string' ||
    !isQuestionnaireSurface(value.surface) ||
    !Array.isArray(value.questions)
  ) {
    return null;
  }
  const sheetMapping = 'sheetMapping' in value
    ? parseSheetMapping(value.sheetMapping)
    : undefined;

  return {
    type: 'comp:sync-questions',
    tabId: typeof value.tabId === 'number' ? value.tabId : undefined,
    url: value.url,
    host: value.host,
    surface: value.surface,
    questions: value.questions.flatMap(parseDetectedQuestion),
    ...(sheetMapping !== undefined ? { sheetMapping } : {}),
  };
}

function parseQueueAction(
  value: Record<string, unknown>,
): BackgroundRequest | null {
  if (typeof value.tabId !== 'number') return null;

  if (
    (value.type === 'comp:generate-queue-item' ||
      value.type === 'comp:approve-queue-item' ||
      value.type === 'comp:select-queue-item' ||
      value.type === 'comp:insert-queue-item') &&
    typeof value.itemId === 'string'
  ) {
    return { type: value.type, tabId: value.tabId, itemId: value.itemId };
  }

  if (
    value.type === 'comp:generate-all' ||
    value.type === 'comp:approve-high-confidence' ||
    value.type === 'comp:approve-all-generated' ||
    value.type === 'comp:insert-approved'
  ) {
    return { type: value.type, tabId: value.tabId };
  }

  if (
    value.type === 'comp:prepare-sheet-paste' ||
    value.type === 'comp:insert-sheet-api'
  ) {
    return {
      type: value.type,
      tabId: value.tabId,
      itemId: typeof value.itemId === 'string' ? value.itemId : undefined,
    };
  }

  return null;
}

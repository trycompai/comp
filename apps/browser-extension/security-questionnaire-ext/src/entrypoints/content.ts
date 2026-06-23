import { browser } from 'wxt/browser';
import { sendWithDomainConfirmation } from '../lib/dom/content-messaging';
import { contentStyles } from '../lib/dom/content-styles';
import { detectQuestionFields, type FieldCandidate, type WritableField } from '../lib/dom/field-detection';
import { insertAnswerIntoField } from '../lib/dom/field-actions';
import { createInlineButtonHost, setInlineButtonState } from '../lib/dom/inline-button';
import { InlinePreview } from '../lib/dom/inline-preview';
import { getPageSurface, shouldSkipQuestionnaireInjection } from '../lib/dom/page-surface';
import { detectSheetQuestionsForPage } from '../lib/dom/sheets-runtime';
import { prepareSheetPaste } from '../lib/dom/sheets-insert';
import { sendRuntimeMessage } from '../lib/dom/safe-runtime';
import { parseContentRequest } from '../lib/messaging';
import { getResponseError, isCountResponse, isItemResponse, isQueueResponse } from '../lib/response-guards';
import type { DetectedQuestion, QuestionQueueItem, TabQuestionQueue } from '../lib/types';

const FIELD_ID_ATTR = 'data-comp-sq-field-id';
const BUTTON_ATTR = 'data-comp-sq-button-for';

let nextFieldId = 1;
let refreshTimer: number | null = null;
let detectionEnabled = true;
let activePreview: InlinePreview | null = null;

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    if (shouldSkipQuestionnaireInjection(window.location)) return;
    injectStyles();
    scheduleInitialRefresh();
    observePageChanges();
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const request = parseContentRequest(message);
      if (!request) return false;

      void handleContentRequest(request)
        .then((response) => sendResponse(response))
        .catch((error: unknown) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'Unexpected error',
          });
        });
      return true;
    });
  },
});

async function handleContentRequest(
  request: NonNullable<ReturnType<typeof parseContentRequest>>,
) {
  if (request.type === 'comp:set-detection-enabled') {
    detectionEnabled = request.enabled;
    refreshInlineButtons();
    return { ok: true, count: (await collectDetectedQuestions()).length };
  }
  if (
    request.type === 'comp:collect-questions' ||
    request.type === 'comp:scan-visible-questions'
  ) {
    refreshInlineButtons();
    const queue = await syncDetectedQuestions();
    return { ok: true, count: queue.items.length };
  }
  if (request.type === 'comp:ensure-inline-buttons') {
    refreshInlineButtons();
    return { ok: true, count: (await collectDetectedQuestions()).length };
  }
  if (request.type === 'comp:insert-answers') {
    return insertAnswers(request.answers);
  }
  if (request.type === 'comp:focus-question') {
    focusQuestion(request.fieldId);
    return { ok: true, count: 1 };
  }
  return { ok: false, error: 'Unsupported content request.' };
}

function injectStyles(): void {
  if (document.getElementById('comp-sq-styles')) return;
  const style = document.createElement('style');
  style.id = 'comp-sq-styles';
  style.textContent = contentStyles;
  document.head.appendChild(style);
}

function observePageChanges(): void {
  const observer = new MutationObserver(() => {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refreshInlineButtons, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function scheduleInitialRefresh(): void {
  const delayMs = document.readyState === 'complete' ? 800 : 1400;
  window.setTimeout(refreshInlineButtons, delayMs);
}

function refreshInlineButtons(): void {
  if (shouldSkipQuestionnaireInjection(window.location)) return;
  if (!detectionEnabled || !usesFieldDetection()) {
    removeInlineButtons();
    void syncDetectedQuestions().catch(() => undefined);
    return;
  }

  for (const candidate of collectFields()) {
    const fieldId = getOrCreateFieldId(candidate.element);
    if (document.querySelector(`[${BUTTON_ATTR}="${fieldId}"]`)) continue;
    candidate.element.insertAdjacentElement(
      'afterend',
      createInlineButtonHost({
        fieldId,
        buttonAttribute: BUTTON_ATTR,
        onClick: () => {
          void handleSingleGenerate(fieldId);
        },
      }),
    );
  }
  void syncDetectedQuestions().catch(() => undefined);
}

async function handleSingleGenerate(fieldId: string): Promise<void> {
  const candidate = findCandidateById(fieldId);
  const button = findButtonHost(fieldId);
  if (!candidate || !button) return;

  setInlineButtonState(button, 'busy');
  activePreview?.close();
  activePreview = new InlinePreview(button);
  activePreview.showLoading(candidate.question);

  try {
    const queue = await syncDetectedQuestions();
    const response = await sendWithDomainConfirmation({
      type: 'comp:generate-queue-item',
      tabId: queue.tabId,
      itemId: fieldId,
    });
    if (!isItemResponse(response)) throw new Error(getResponseError(response));
    activePreview.showResult(response.item, {
      onDismiss: () => setInlineButtonState(button, 'idle'),
      onRegenerate: () => void handleSingleGenerate(fieldId),
      onInsert: (answer) => {
        void insertInlineAnswer({ queue, item: response.item, answer, button })
          .catch((error: unknown) => {
            window.alert(error instanceof Error ? error.message : 'Unable to insert answer');
            setInlineButtonState(button, 'idle');
          });
      },
    });
  } catch (error) {
    activePreview?.close();
    window.alert(error instanceof Error ? error.message : 'Unable to generate answer');
    setInlineButtonState(button, 'idle');
  }
}

async function insertInlineAnswer(params: {
  queue: TabQuestionQueue;
  item: QuestionQueueItem;
  answer: string;
  button: HTMLElement;
}): Promise<void> {
  const editResponse = await sendRuntimeMessage({
    type: 'comp:edit-queue-item',
    tabId: params.queue.tabId,
    itemId: params.item.id,
    answer: params.answer,
  });
  if (editResponse === null) throw new Error('Extension was reloaded. Refresh this page and try again.');
  const response = await sendWithDomainConfirmation({
    type: 'comp:insert-queue-item',
    tabId: params.queue.tabId,
    itemId: params.item.id,
  });
  if (!isCountResponse(response)) throw new Error(getResponseError(response));
  activePreview?.close();
  setInlineButtonState(params.button, 'inserted');
}

async function syncDetectedQuestions(): Promise<TabQuestionQueue> {
  const questions = await collectDetectedQuestions();
  const response = await sendRuntimeMessage({
    type: 'comp:sync-questions',
    url: window.location.href,
    host: window.location.host,
    surface: getPageSurface(window.location),
    questions,
  });
  if (response === null) {
    throw new Error('Extension context invalidated. Reload this page.');
  }
  if (!isQueueResponse(response)) throw new Error(getResponseError(response));
  return response.queue;
}

async function insertAnswers(
  answers: { fieldId: string; answer: string }[],
): Promise<{ ok: true; insertedCount: number; failedIds: string[] }> {
  if (getPageSurface(window.location) === 'sheets') {
    const result = await prepareSheetPaste({
      answers,
      root: document,
    });
    return {
      ok: true,
      insertedCount: result.insertedIds.length,
      failedIds: result.failedIds,
    };
  }

  const failedIds: string[] = [];
  for (const answer of answers) {
    const candidate = findCandidateById(answer.fieldId);
    if (!candidate) {
      failedIds.push(answer.fieldId);
      continue;
    }
    insertAnswerIntoField({ field: candidate.element, answer: answer.answer });
    flashField(candidate.element);
    setInlineButtonState(findButtonHost(answer.fieldId), 'inserted');
  }
  return {
    ok: true,
    insertedCount: answers.length - failedIds.length,
    failedIds,
  };
}

function collectFields(): FieldCandidate[] {
  if (shouldSkipQuestionnaireInjection(window.location)) return [];
  if (!detectionEnabled || !usesFieldDetection()) return [];
  return detectQuestionFields(document, { visibleOnly: true });
}

async function collectDetectedQuestions(): Promise<DetectedQuestion[]> {
  const surface = getPageSurface(window.location);
  if (surface === 'sheets') {
    return detectSheetQuestionsForPage({ location: window.location, root: document });
  }
  return collectFields().map(toDetectedQuestion);
}

function usesFieldDetection(): boolean {
  const surface = getPageSurface(window.location);
  return surface === 'generic' || surface === 'forms';
}
function toDetectedQuestion(candidate: FieldCandidate): DetectedQuestion {
  return {
    id: getOrCreateFieldId(candidate.element),
    question: candidate.question,
    value: candidate.value,
    isEmpty: candidate.isEmpty,
    tag: candidate.tag,
  };
}

function findCandidateById(fieldId: string): FieldCandidate | null {
  return (
    collectFields().find(
      (candidate) => candidate.element.getAttribute(FIELD_ID_ATTR) === fieldId,
    ) ?? null
  );
}

function getOrCreateFieldId(field: WritableField): string {
  const existing = field.getAttribute(FIELD_ID_ATTR);
  if (existing) return existing;
  const fieldId = `comp-sq-${nextFieldId}`;
  nextFieldId += 1;
  field.setAttribute(FIELD_ID_ATTR, fieldId);
  return fieldId;
}

function findButtonHost(fieldId: string): HTMLElement | null {
  const element = document.querySelector(`[${BUTTON_ATTR}="${fieldId}"]`);
  return element instanceof HTMLElement ? element : null;
}

function focusQuestion(fieldId: string): void {
  const candidate = findCandidateById(fieldId);
  if (!candidate) return;
  candidate.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flashField(candidate.element);
}

function flashField(field: WritableField): void {
  field.classList.add('comp-sq-flash');
  window.setTimeout(() => field.classList.remove('comp-sq-flash'), 900);
}

function removeInlineButtons(): void {
  document.querySelectorAll(`[${BUTTON_ATTR}]`).forEach((element) => element.remove());
}

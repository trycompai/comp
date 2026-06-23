import { browser } from 'wxt/browser';

export function bindAnswerAutosave(params: {
  root: ParentNode;
  tabId: number | null;
}): void {
  params.root.querySelectorAll('[data-answer-for]').forEach((element) => {
    if (!(element instanceof HTMLTextAreaElement)) return;
    element.addEventListener('change', () => {
      void saveTextareaAnswer({ tabId: params.tabId, textarea: element });
    });
  });
}

export async function saveAnswerForItem(params: {
  root: ParentNode;
  tabId: number | null;
  itemId: string;
}): Promise<void> {
  const textarea = params.root.querySelector(
    `[data-answer-for="${cssEscape(params.itemId)}"]`,
  );
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  await saveTextareaAnswer({ tabId: params.tabId, textarea });
}

export async function saveAllVisibleAnswers(params: {
  root: ParentNode;
  tabId: number | null;
}): Promise<void> {
  const textareas = Array.from(params.root.querySelectorAll('[data-answer-for]'))
    .filter((element): element is HTMLTextAreaElement =>
      element instanceof HTMLTextAreaElement,
    );
  await Promise.all(
    textareas.map((textarea) =>
      saveTextareaAnswer({ tabId: params.tabId, textarea }),
    ),
  );
}

async function saveTextareaAnswer(params: {
  tabId: number | null;
  textarea: HTMLTextAreaElement;
}): Promise<void> {
  const itemId = params.textarea.dataset.answerFor;
  if (!params.tabId || !itemId) return;
  await browser.runtime.sendMessage({
    type: 'comp:edit-queue-item',
    tabId: params.tabId,
    itemId,
    answer: params.textarea.value,
  });
}

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

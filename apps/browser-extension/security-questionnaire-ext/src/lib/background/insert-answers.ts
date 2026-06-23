import { browser } from 'wxt/browser';
import type { InsertAnswerRequest } from '../types';

interface InsertResponse {
  ok: true;
  insertedCount: number;
  failedIds: string[];
}

export async function insertAnswersIntoTab(params: {
  tabId: number;
  answers: InsertAnswerRequest[];
}): Promise<string[]> {
  const response = await sendInsertMessage(params).catch(async (error: unknown) => {
    if (!shouldInjectContentScript(error)) throw error;
    await injectContentScript(params.tabId);
    return sendInsertMessage(params);
  });

  if (!isInsertResponse(response)) {
    throw new Error(getInsertError(response));
  }
  return params.answers
    .filter((answer) => !response.failedIds.includes(answer.fieldId))
    .map((answer) => answer.fieldId);
}

function sendInsertMessage(params: {
  tabId: number;
  answers: InsertAnswerRequest[];
}): Promise<unknown> {
  return browser.tabs.sendMessage(params.tabId, {
    type: 'comp:insert-answers',
    answers: params.answers,
  });
}

async function injectContentScript(tabId: number): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    files: ['/content-scripts/content.js'],
    injectImmediately: true,
  });
}

function shouldInjectContentScript(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('receiving end') ||
    message.includes('could not establish connection')
  );
}

function isInsertResponse(value: unknown): value is InsertResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    value.ok === true &&
    'failedIds' in value &&
    Array.isArray(value.failedIds)
  );
}

function getInsertError(value: unknown): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error;
  }
  return 'Unable to copy or insert answers on this page.';
}

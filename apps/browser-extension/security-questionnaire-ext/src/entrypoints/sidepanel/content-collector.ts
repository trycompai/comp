import { browser } from 'wxt/browser';
import {
  isRecord,
  parseDetectedQuestion,
} from '../../lib/message-utils';
import {
  getResponseError,
  isCountResponse,
} from '../../lib/response-guards';
import { formatScanDebug, getScanDebug } from '../../lib/scan-debug';
import { parseSheetMapping } from '../../lib/sheet-mapping';
import type { DetectedQuestion, SheetMapping } from '../../lib/types';

export async function collectQuestions(tabId: number): Promise<string> {
  const sheetScan = await collectSheetQuestionsFromBackground(tabId);
  if (sheetScan?.count && sheetScan.count > 0) return '';

  const response = await sendCollectMessage(tabId);
  if (isCountResponse(response)) {
    if (response.count > 0) return '';
    return sheetScan?.message ?? formatDebugResponse(response);
  }
  if (!shouldRetryWithInjectedScript(response)) return getResponseError(response);

  const injected = await injectContentScript(tabId);
  if (!injected) {
    return 'Unable to attach the page scanner. Reload this tab and press Refresh.';
  }
  const retry = await sendCollectMessage(tabId);
  if (!isCountResponse(retry)) return getResponseError(retry);
  if (retry.count > 0) return '';
  return sheetScan?.message ?? formatDebugResponse(retry);
}

async function sendCollectMessage(tabId: number): Promise<unknown> {
  return browser.tabs.sendMessage(tabId, { type: 'comp:collect-questions' }).catch((error: unknown) => ({
    ok: false,
    error: error instanceof Error ? error.message : 'Unable to scan this page.',
  }));
}

async function collectSheetQuestionsFromBackground(tabId: number): Promise<{
  count: number;
  message: string;
} | null> {
  const tab = await browser.tabs.get(tabId).catch(() => null);
  const sheet = parseSheetTab(tab?.url);
  if (!sheet) return null;

  const response = await browser.runtime.sendMessage({
    type: 'comp:detect-sheet-questions',
    pathname: sheet.pathname,
    hash: sheet.hash,
  }).catch((error: unknown) => ({
    ok: false,
    error: error instanceof Error ? error.message : 'Background sheet scan failed.',
  }));
  const debug = getScanDebug(response);
  const questions = getDetectedQuestions(response);
  const sheetMapping = getDetectedSheetMapping(response);
  await browser.runtime.sendMessage({
    type: 'comp:sync-questions',
    tabId,
    url: sheet.url,
    host: sheet.host,
    surface: 'sheets',
    questions,
    sheetMapping,
  });
  return {
    count: questions.length,
    message: questions.length > 0
      ? ''
      : debug
        ? formatScanDebug(debug)
        : '',
  };
}

function parseSheetTab(url: string | undefined): {
  hash: string;
  host: string;
  pathname: string;
  url: string;
} | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'docs.google.com') return null;
    if (!parsed.pathname.startsWith('/spreadsheets/')) return null;
    return {
      hash: parsed.hash,
      host: parsed.host,
      pathname: parsed.pathname,
      url,
    };
  } catch {
    return null;
  }
}

function getDetectedQuestions(value: unknown): DetectedQuestion[] {
  if (!isRecord(value) || !Array.isArray(value.questions)) return [];
  return value.questions.flatMap(parseDetectedQuestion);
}

function getDetectedSheetMapping(value: unknown): SheetMapping | null {
  if (!isRecord(value)) return null;
  return parseSheetMapping(value.mapping);
}

function formatDebugResponse(response: unknown): string {
  const debug = getScanDebug(response);
  return debug ? formatScanDebug(debug) : '';
}

async function injectContentScript(tabId: number): Promise<boolean> {
  return browser.scripting.executeScript({
    target: { tabId },
    files: ['/content-scripts/content.js'],
    injectImmediately: true,
  }).then(() => true).catch(() => false);
}

function shouldRetryWithInjectedScript(response: unknown): boolean {
  const error = getResponseError(response).toLowerCase();
  return (
    error.includes('receiving end') ||
    error.includes('could not establish connection')
  );
}

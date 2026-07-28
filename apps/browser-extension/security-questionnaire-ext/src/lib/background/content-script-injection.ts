import { browser } from 'wxt/browser';
import { shouldSkipQuestionnaireInjection } from '../dom/page-surface';

const CONTENT_SCRIPT_FILE = '/content-scripts/content.js';

const pendingTabs = new Set<number>();

export function setupContentScriptAutoInjection(): void {
  void ensureActiveTabs();
  browser.runtime.onInstalled.addListener(() => {
    void ensureActiveTabs();
  });
  browser.runtime.onStartup.addListener(() => {
    void ensureActiveTabs();
  });
  browser.tabs.onActivated.addListener((activeInfo) => {
    void ensureContentScript(activeInfo.tabId);
  });
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    void ensureContentScript(tabId, tab.url);
  });
}

export function canInjectQuestionnaireUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) return false;
    return !shouldSkipQuestionnaireInjection(parsed);
  } catch {
    return false;
  }
}

async function ensureActiveTabs(): Promise<void> {
  const tabs = await browser.tabs.query({ active: true }).catch(() => []);
  await Promise.all(tabs.map((tab) => ensureContentScript(tab.id, tab.url)));
}

async function ensureContentScript(
  tabId: number | undefined,
  url?: string,
): Promise<void> {
  if (typeof tabId !== 'number' || pendingTabs.has(tabId)) return;
  pendingTabs.add(tabId);
  try {
    const tabUrl = url ?? (await browser.tabs.get(tabId).catch(() => null))?.url;
    if (!canInjectQuestionnaireUrl(tabUrl)) return;
    if (await ensureInlineButtons(tabId)) return;
    await browser.scripting.executeScript({
      files: [CONTENT_SCRIPT_FILE],
      injectImmediately: true,
      target: { tabId },
    });
    await ensureInlineButtons(tabId);
  } catch {
    // Some pages cannot be scripted even with host permissions.
  } finally {
    pendingTabs.delete(tabId);
  }
}

async function ensureInlineButtons(tabId: number): Promise<boolean> {
  const response = await browser.tabs
    .sendMessage(tabId, { type: 'comp:ensure-inline-buttons' })
    .catch(() => null);
  return isCountResponse(response);
}

function isCountResponse(value: unknown): value is { ok: true; count: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    value.ok === true &&
    'count' in value &&
    typeof value.count === 'number'
  );
}

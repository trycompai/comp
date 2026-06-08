import { browser } from 'wxt/browser';
import {
  getResponseError,
  isConfirmationResponse,
  isCountResponse,
  isOkResponse,
  isPanelStateResponse,
  isQueueResponse,
} from '../../lib/response-guards';
import type { DomainConfirmationRequest, PanelState } from '../../lib/types';
import {
  bindAnswerAutosave,
  saveAllVisibleAnswers,
  saveAnswerForItem,
} from './answer-edits';
import { getActiveTab, getHost } from './active-tab';
import { collectQuestions } from './content-collector';
import { showDialog } from './dialog';
import {
  renderDomainDialog,
  renderInsertDialog,
  renderSidePanel,
  renderStaleDialog,
} from './render';
import { handleSheetMappingChange } from './sheet-mapping-actions';
import { handleSheetPaste } from './sheet-paste-actions';
import './style.css';
import './queue-polish.css';
import './sticky-footer.css';
import './sheet-mapping.css';

const app = document.getElementById('app');
if (!app) throw new Error('Side panel root not found');
const appRoot = app;

let state: PanelState | null = null;
let activeTabId: number | null = null;
let statusMessage = '';
let isRefreshing = false;

void initialize();

async function initialize(): Promise<void> {
  await refreshFromPage();
  browser.runtime.onMessage.addListener((message) => {
    if (isPanelRefreshMessage(message)) void refreshState();
  });
}

async function refreshFromPage(): Promise<void> {
  const tab = await getActiveTab();
  activeTabId = tab.id ?? null;
  if (!activeTabId) {
    renderMessage('No active tab found.');
    return;
  }
  statusMessage = await collectQuestions(activeTabId);
  await refreshState(tab.url);
}

async function refreshState(url?: string): Promise<void> {
  if (!activeTabId) return;
  const response = await browser.runtime.sendMessage({
    type: 'comp:get-panel-state',
    tabId: activeTabId,
    url,
    host: url ? getHost(url) : undefined,
  });
  if (!isPanelStateResponse(response)) {
    renderMessage(getResponseError(response));
    return;
  }
  state = response.panelState;
  render();
}

function render(message = statusMessage): void {
  if (!state) {
    renderMessage('Loading questionnaire queue...');
    return;
  }
  const scrollTop = getListScrollTop();
  appRoot.innerHTML = renderSidePanel(state, message, isRefreshing);
  bindEvents();
  restoreListScrollTop(scrollTop);
}

function bindEvents(): void {
  bindAnswerAutosave({ root: appRoot, tabId: activeTabId });
  appRoot.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', (event) => {
      const target = event.currentTarget;
      if (target instanceof HTMLElement) void handleAction(target);
    });
  });
  const orgSelect = appRoot.querySelector('[data-action="switch-org"]');
  if (orgSelect instanceof HTMLSelectElement) {
    orgSelect.addEventListener('change', () => {
      void handleOrgSwitch(orgSelect.value);
    });
  }
}

async function handleAction(target: HTMLElement): Promise<void> {
  const action = target.dataset.action;
  const itemId = target.dataset.itemId;
  if (action === 'sign-in') await browser.runtime.sendMessage({ type: 'comp:open-sign-in' });
  if (action === 'refresh') {
    isRefreshing = true;
    render('Refreshing page scan...');
    try {
      await refreshFromPage();
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : 'Unable to refresh scan.';
    } finally { isRefreshing = false; }
    render(statusMessage || `Scan refreshed · ${state?.queue.items.length ?? 0} found.`);
  }
  if (action === 'close') await closePanel();
  if (action === 'generate-all') await runQueueAction({ type: 'comp:generate-all' });
  if (action === 'approve-all') await runQueueAction({ type: 'comp:approve-all-generated' });
  if (action === 'insert-approved') await handleInsertApproved();
  if (action === 'change-sheet-mapping') {
    await handleSheetMappingChange({
      state,
      refreshFromPage,
      setStatus,
    });
  }
  if (action === 'select-item' && itemId) await handleSelectItem(itemId);
  if (action === 'approve-item' && itemId) {
    await saveAnswerForItem({ root: appRoot, tabId: activeTabId, itemId });
    await runQueueAction({ type: 'comp:approve-queue-item', itemId });
  }
  if (action === 'insert-item' && itemId) {
    if (state?.queue.surface === 'sheets') {
      await handleSheetPaste({
        activeTabId,
        itemId,
        refreshState,
        root: appRoot,
        setStatus,
        state,
      });
      return;
    }
    await saveAnswerForItem({ root: appRoot, tabId: activeTabId, itemId });
    await runQueueAction({ type: 'comp:insert-queue-item', itemId });
  }
}

async function handleOrgSwitch(organizationId: string): Promise<void> {
  if (!activeTabId) return;
  const response = await browser.runtime.sendMessage({
    type: 'comp:set-active-org',
    organizationId,
    tabId: activeTabId,
  });
  if (!isOkResponse(response) && !isStaleResponse(response)) {
    setStatus(getResponseError(response));
    return;
  }
  await refreshState();
  if (isStaleResponse(response) && response.staleDraftCount > 0) {
    await showDialog(renderStaleDialog(response.staleDraftCount));
  }
}

async function handleSelectItem(itemId: string): Promise<void> {
  await runQueueAction({ type: 'comp:select-queue-item', itemId });
  await browser.tabs.sendMessage(activeTabId ?? 0, {
    type: 'comp:focus-question',
    fieldId: itemId,
  }).catch(() => undefined);
}

async function handleInsertApproved(): Promise<void> {
  const currentState = state;
  if (!currentState) return;
  if (currentState.queue.surface === 'sheets') {
    await handleSheetPaste({
      activeTabId,
      refreshState,
      root: appRoot,
      setStatus,
      state: currentState,
    });
    return;
  }
  await saveAllVisibleAnswers({ root: appRoot, tabId: activeTabId });
  const approved = currentState.queue.items.filter((item) => item.status === 'approved');
  if (approved.length === 0) return;
  const org = currentState.auth.organizations.find(
    (entry) => entry.id === currentState.auth.selectedOrganizationId,
  );
  const confirmed = await showDialog(renderInsertDialog({
    count: approved.length,
    host: currentState.queue.host,
    organizationName: org?.name ?? 'selected organization',
    operation: 'Insert',
    lowConfidenceCount: currentState.queue.items.filter(
      (item) => item.confidence === 'low' && item.status !== 'approved',
    ).length,
  }));
  if (confirmed) await runQueueAction({ type: 'comp:insert-approved' });
}

async function runQueueAction(params: {
  type:
    | 'comp:generate-all'
    | 'comp:approve-all-generated'
    | 'comp:insert-approved'
    | 'comp:approve-queue-item'
    | 'comp:insert-queue-item'
    | 'comp:select-queue-item';
  itemId?: string;
}): Promise<void> {
  if (!activeTabId) return;
  setStatus('');
  const response = await browser.runtime.sendMessage({
    type: params.type,
    tabId: activeTabId,
    itemId: params.itemId,
  });
  if (isConfirmationResponse(response)) {
    await handleDomainConfirmation(response.confirmation, params);
    return;
  }
  if (!isQueueResponse(response) && !isCountResponse(response)) {
    setStatus(getResponseError(response));
    return;
  }
  await refreshState();
}

async function handleDomainConfirmation(
  confirmation: DomainConfirmationRequest,
  retry: Parameters<typeof runQueueAction>[0],
): Promise<void> {
  const confirmed = await showDialog(renderDomainDialog({
    host: confirmation.host,
    organizationName: confirmation.organizationName,
  }));
  if (!confirmed) return;
  await browser.runtime.sendMessage({
    type: 'comp:confirm-domain',
    host: confirmation.host,
    organizationId: confirmation.organizationId,
  });
  await runQueueAction(retry);
}

async function closePanel(): Promise<void> {
  if (!activeTabId) return;
  await browser.sidePanel.close({ tabId: activeTabId }).catch(() => window.close());
}

function setStatus(message: string): void {
  statusMessage = message;
  render(message);
}

function renderMessage(message: string): void {
  appRoot.innerHTML = `<div class="shell"><div class="empty"><p>${escapeHtml(message)}</p></div></div>`;
}

function getListScrollTop(): number | null {
  const list = appRoot.querySelector('.list');
  return list instanceof HTMLElement ? list.scrollTop : null;
}

function restoreListScrollTop(value: number | null): void {
  if (value === null) return;
  const list = appRoot.querySelector('.list');
  if (list instanceof HTMLElement) list.scrollTop = value;
}

function isPanelRefreshMessage(value: unknown): value is { type: string } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    (value.type === 'comp:queue-updated' || value.type === 'comp:auth-updated');
}

function isStaleResponse(value: unknown): value is { ok: true; staleDraftCount: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    value.ok === true &&
    'staleDraftCount' in value &&
    typeof value.staleDraftCount === 'number'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

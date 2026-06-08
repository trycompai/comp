import { browser } from 'wxt/browser';
import {
  getResponseError,
  isConfirmationResponse,
  isCountResponse,
  isQueueResponse,
  isSheetPasteResponse,
} from '../../lib/response-guards';
import { extensionConfig } from '../../lib/config';
import type { DomainConfirmationRequest, PanelState } from '../../lib/types';
import {
  saveAllVisibleAnswers,
  saveAnswerForItem,
} from './answer-edits';
import { showDialog } from './dialog';
import { renderDomainDialog, renderInsertDialog } from './render';
import { showSheetPasteDialog } from './sheet-paste-dialog';

export async function handleSheetPaste(params: {
  activeTabId: number | null;
  itemId?: string;
  refreshState(): Promise<void>;
  root: HTMLElement;
  setStatus(message: string): void;
  state: PanelState | null;
}): Promise<void> {
  if (!params.activeTabId || !params.state) return;
  const activeTabId = params.activeTabId;
  await saveAnswersBeforeInsert({
    activeTabId,
    itemId: params.itemId,
    root: params.root,
  });

  if (extensionConfig.googleSheetsApiEnabled) {
    await handleSheetApiInsert({
      activeTabId,
      itemId: params.itemId,
      refreshState: params.refreshState,
      setStatus: params.setStatus,
      state: params.state,
    });
    return;
  }

  const prepared = await prepareSheetPaste({
    activeTabId,
    itemId: params.itemId,
  });
  if (!isSheetPasteResponse(prepared)) {
    params.setStatus(getResponseError(prepared));
    return;
  }

  const confirmed = await showSheetPasteDialog(prepared.sheetPaste);
  if (!confirmed) return;

  const marked = await browser.runtime.sendMessage({
    type: 'comp:mark-sheet-paste-inserted',
    tabId: activeTabId,
    itemIds: prepared.sheetPaste.itemIds,
  });
  if (!isQueueResponse(marked)) {
    params.setStatus(getResponseError(marked));
    return;
  }
  await params.refreshState();
}

async function handleSheetApiInsert(params: {
  activeTabId: number;
  itemId?: string;
  refreshState(): Promise<void>;
  setStatus(message: string): void;
  state: PanelState;
}): Promise<void> {
  if (!params.itemId && !(await confirmBatchInsert(params.state))) return;

  const response = await insertSheetWithApi({
    activeTabId: params.activeTabId,
    itemId: params.itemId,
  });
  if (!isCountResponse(response) && !isQueueResponse(response)) {
    params.setStatus(getResponseError(response));
    return;
  }
  await params.refreshState();
}

async function saveAnswersBeforeInsert(params: {
  activeTabId: number;
  itemId?: string;
  root: HTMLElement;
}): Promise<void> {
  if (params.itemId) {
    await saveAnswerForItem({
      root: params.root,
      tabId: params.activeTabId,
      itemId: params.itemId,
    });
    return;
  }
  await saveAllVisibleAnswers({
    root: params.root,
    tabId: params.activeTabId,
  });
}

async function confirmBatchInsert(state: PanelState): Promise<boolean> {
  const approved = state.queue.items.filter((item) => item.status === 'approved');
  if (approved.length === 0) return false;
  const org = state.auth.organizations.find(
    (entry) => entry.id === state.auth.selectedOrganizationId,
  );
  return showDialog(renderInsertDialog({
    count: approved.length,
    host: state.queue.host,
    organizationName: org?.name ?? 'selected organization',
    operation: 'Insert',
    lowConfidenceCount: state.queue.items.filter(
      (item) => item.confidence === 'low' && item.status !== 'approved',
    ).length,
  }));
}

async function prepareSheetPaste(params: {
  activeTabId: number;
  itemId?: string;
}): Promise<unknown> {
  const response = await browser.runtime.sendMessage({
    type: 'comp:prepare-sheet-paste',
    tabId: params.activeTabId,
    itemId: params.itemId,
  });
  if (!isConfirmationResponse(response)) return response;

  const confirmed = await confirmDomain(response.confirmation);
  if (!confirmed) return { ok: false, error: 'Paste cancelled.' };
  await browser.runtime.sendMessage({
    type: 'comp:confirm-domain',
    host: response.confirmation.host,
    organizationId: response.confirmation.organizationId,
  });
  return prepareSheetPaste(params);
}

async function insertSheetWithApi(params: {
  activeTabId: number;
  itemId?: string;
}): Promise<unknown> {
  const response = await browser.runtime.sendMessage({
    type: 'comp:insert-sheet-api',
    tabId: params.activeTabId,
    itemId: params.itemId,
  });
  if (!isConfirmationResponse(response)) return response;

  const confirmed = await confirmDomain(response.confirmation);
  if (!confirmed) return { ok: false, error: 'Insert cancelled.' };
  await browser.runtime.sendMessage({
    type: 'comp:confirm-domain',
    host: response.confirmation.host,
    organizationId: response.confirmation.organizationId,
  });
  return insertSheetWithApi(params);
}

async function confirmDomain(
  confirmation: DomainConfirmationRequest,
): Promise<boolean> {
  return showDialog(renderDomainDialog({
    host: confirmation.host,
    organizationName: confirmation.organizationName,
  }));
}

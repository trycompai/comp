import { browser } from 'wxt/browser';
import {
  createEmptyQueue,
  setQueueOrganization,
  syncDetectedQuestions,
} from '../queue';
import { detectSheetQuestionsWithDebug } from '../dom/sheets-debug';
import { parseSheetIdentity } from '../sheet-mapping';
import {
  getSavedSheetMapping,
  saveSheetMapping,
} from '../sheet-mapping-storage';
import {
  getDetectionEnabled,
  getSelectedOrganizationId,
  setConfirmedDomain,
  setDetectionEnabled,
} from '../storage';
import type { AuthState, TabQuestionQueue } from '../types';
import type { BackgroundRequest, BackgroundResponse } from '../messaging';
import {
  getExtensionAuthState,
  openSignIn,
  switchActiveOrganization,
} from './auth';
import {
  generateLegacyAnswer,
  handleQueueAction,
  saveQueueAndNotify,
} from './queue-actions';
import {
  getQueueHost,
  getQueueSurface,
  shouldResetQueueForUrl,
} from './queue-scope';
import { loadTabQueue, saveTabQueue } from './queue-store';

export async function handleBackgroundRequest(params: {
  request: BackgroundRequest;
  senderTabId: number | null;
}): Promise<BackgroundResponse> {
  const { request } = params;
  if (request.type === 'comp:get-auth-state') {
    return { ok: true, state: await getExtensionAuthState() };
  }
  if (request.type === 'comp:open-sign-in') {
    await openSignIn();
    return { ok: true };
  }
  if (request.type === 'comp:open-side-panel') {
    await browser.sidePanel.open({ tabId: request.tabId });
    return { ok: true };
  }
  if (request.type === 'comp:set-active-org') {
    return switchOrg(request.organizationId, 'tabId' in request ? request.tabId : null);
  }
  if (request.type === 'comp:confirm-domain') {
    await setConfirmedDomain(request);
    return { ok: true };
  }
  if (request.type === 'comp:set-detection-enabled') {
    await setDetectionEnabled(request);
    return { ok: true };
  }
  if (request.type === 'comp:detect-sheet-questions') {
    const identity = parseSheetIdentity({
      hash: request.hash,
      pathname: request.pathname,
    });
    const mapping = identity ? await getSavedSheetMapping(identity) : null;
    const result = await detectSheetQuestionsWithDebug({
      location: {
        hash: request.hash,
        pathname: request.pathname,
      },
      mapping,
    });
    return {
      ok: true,
      questions: result.questions,
      debug: result.debug,
      mapping: result.mapping,
    };
  }
  if (request.type === 'comp:set-sheet-mapping') {
    await saveSheetMapping(request.mapping);
    return { ok: true };
  }
  if (request.type === 'comp:sync-questions') {
    return syncQuestions({ request, senderTabId: params.senderTabId });
  }
  if (request.type === 'comp:get-panel-state') {
    return getPanelState(request.tabId, request.url, request.host);
  }
  if (request.type === 'comp:generate-answer') {
    return generateLegacyAnswer(request);
  }
  return handleQueueAction(request);
}

async function switchOrg(
  organizationId: string,
  tabId: number | null,
): Promise<BackgroundResponse> {
  await switchActiveOrganization(organizationId);
  if (tabId === null) return { ok: true, staleDraftCount: 0 };

  const queue = await loadTabQueue(tabId);
  if (!queue) return { ok: true, staleDraftCount: 0 };

  const updated = setQueueOrganization({ queue, organizationId });
  await saveQueueAndNotify(updated);
  return { ok: true, staleDraftCount: updated.staleDraftCount };
}

async function syncQuestions(params: {
  request: Extract<BackgroundRequest, { type: 'comp:sync-questions' }>;
  senderTabId: number | null;
}): Promise<BackgroundResponse> {
  const tabId = params.request.tabId ?? params.senderTabId;
  if (typeof tabId !== 'number') {
    throw new Error('Unable to identify the active tab.');
  }

  const organizationId = await getSelectedOrganizationId();
  const current = await loadTabQueue(tabId);
  const queue = syncDetectedQuestions({
    queue: shouldResetQueueForUrl({ queue: current, url: params.request.url })
      ? null
      : current,
    tabId,
    url: params.request.url,
    host: params.request.host,
    surface: params.request.surface,
    organizationId,
    questions: params.request.questions,
    sheetMapping: params.request.sheetMapping,
  });
  await saveQueueAndNotify(queue);
  return { ok: true, count: queue.items.length, queue };
}

async function getPanelState(
  tabId: number,
  url?: string,
  host?: string,
): Promise<BackgroundResponse> {
  const auth = await getExtensionAuthState();
  const queue = await loadOrCreateQueue({ tabId, auth, url, host });
  const detectionEnabled = await getDetectionEnabled(queue.host);
  return { ok: true, panelState: { auth, queue, detectionEnabled } };
}

async function loadOrCreateQueue(params: {
  tabId: number;
  auth: AuthState;
  url?: string;
  host?: string;
}): Promise<TabQuestionQueue> {
  const existing = await loadTabQueue(params.tabId);
  const organizationId = params.auth.selectedOrganizationId;
  if (existing) {
    if (shouldResetQueueForUrl({ queue: existing, url: params.url })) {
      const queue = createEmptyQueue({
        tabId: params.tabId,
        url: params.url ?? '',
        host: params.host ?? getQueueHost(params.url),
        surface: getQueueSurface(params.url),
        organizationId,
      });
      await saveTabQueue(queue);
      return queue;
    }
    const updated = setQueueOrganization({ queue: existing, organizationId });
    if (updated !== existing) await saveTabQueue(updated);
    return updated;
  }
  const queue = createEmptyQueue({
    tabId: params.tabId,
    url: params.url ?? '',
    host: params.host ?? getQueueHost(params.url),
    surface: getQueueSurface(params.url),
    organizationId,
  });
  await saveTabQueue(queue);
  return queue;
}

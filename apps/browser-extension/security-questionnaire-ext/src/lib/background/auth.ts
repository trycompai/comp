import { browser } from 'wxt/browser';
import {
  getAuthState,
  setActiveOrganization,
} from '../api';
import { extensionConfig } from '../config';
import {
  clearConfirmedDomains,
  getSelectedOrganizationId,
  setSelectedOrganizationId,
} from '../storage';
import type { AuthState } from '../types';

export type ActiveAuthState = AuthState & { selectedOrganizationId: string };

const AUTH_UPDATED_MESSAGE = 'comp:auth-updated';
const AUTH_WINDOW_WIDTH = 520;
const AUTH_WINDOW_HEIGHT = 720;

let authWindow: { tabId: number | null; windowId: number | null } | null = null;
let isCheckingAuthWindow = false;

export function setupAuthFlowWatcher(): void {
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId !== authWindow?.tabId) return;
    if (!changeInfo.url && changeInfo.status !== 'complete') return;
    void closeAuthWindowIfSignedIn();
  });
  browser.tabs.onRemoved.addListener((tabId) => {
    if (tabId === authWindow?.tabId) authWindow = null;
  });
  browser.windows.onRemoved.addListener((windowId) => {
    if (windowId === authWindow?.windowId) authWindow = null;
  });
}

export async function ensureActiveOrganization(): Promise<ActiveAuthState> {
  const selectedOrganizationId = await getSelectedOrganizationId();
  const state = await getAuthState(selectedOrganizationId);
  if (!state.selectedOrganizationId) {
    throw new Error('Select an organization before generating answers.');
  }

  await setActiveOrganization(state.selectedOrganizationId);
  if (state.selectedOrganizationId !== selectedOrganizationId) {
    await setSelectedOrganizationId(state.selectedOrganizationId);
  }

  return {
    ...state,
    selectedOrganizationId: state.selectedOrganizationId,
  };
}

export async function getExtensionAuthState(): Promise<AuthState> {
  const selectedOrganizationId = await getSelectedOrganizationId();
  const state = await getAuthState(selectedOrganizationId);
  if (
    state.selectedOrganizationId &&
    state.selectedOrganizationId !== selectedOrganizationId
  ) {
    await setSelectedOrganizationId(state.selectedOrganizationId);
  }
  return state;
}

export async function openSignIn(): Promise<void> {
  if (authWindow?.windowId) {
    await browser.windows.update(authWindow.windowId, { focused: true }).catch(() => {
      authWindow = null;
    });
    if (authWindow) return;
  }

  const createdWindow = await browser.windows.create({
    focused: true,
    height: AUTH_WINDOW_HEIGHT,
    type: 'popup',
    url: buildSignInUrl(),
    width: AUTH_WINDOW_WIDTH,
  });
  if (!createdWindow) throw new Error('Unable to open the Comp AI sign-in window.');
  authWindow = {
    tabId: createdWindow.tabs?.[0]?.id ?? null,
    windowId: createdWindow.id ?? null,
  };
}

export async function switchActiveOrganization(
  organizationId: string,
): Promise<void> {
  await setActiveOrganization(organizationId);
  await setSelectedOrganizationId(organizationId);
  await clearConfirmedDomains();
}

function buildSignInUrl(): string {
  const url = new URL('/auth', extensionConfig.appBaseUrl);
  url.searchParams.set('source', 'browser-extension');
  return url.toString();
}

async function closeAuthWindowIfSignedIn(): Promise<void> {
  if (!authWindow || isCheckingAuthWindow) return;
  isCheckingAuthWindow = true;
  try {
    const state = await getExtensionAuthState().catch(() => null);
    if (state?.status !== 'authenticated') return;

    const windowId = authWindow.windowId;
    authWindow = null;
    if (windowId !== null) await browser.windows.remove(windowId).catch(() => undefined);
    await browser.runtime
      .sendMessage({ type: AUTH_UPDATED_MESSAGE })
      .catch(() => undefined);
  } finally {
    isCheckingAuthWindow = false;
  }
}

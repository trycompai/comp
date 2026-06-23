import { browser } from 'wxt/browser';
import { compMarkSvg } from '../../lib/brand';
import {
  getResponseError,
  isOkResponse,
  isPanelStateResponse,
} from '../../lib/response-guards';
import type { PanelState } from '../../lib/types';

const app = document.getElementById('app');
if (!app) throw new Error('Popup root not found');
const appRoot = app;

let activeTab: Browser.tabs.Tab | null = null;
let panelState: PanelState | null = null;

void render();
browser.runtime.onMessage.addListener((message) => {
  if (isAuthUpdate(message)) void render('Signed in.');
});

async function render(statusText = 'Checking session...'): Promise<void> {
  appRoot.innerHTML = shell(`<div class="status">${escapeHtml(statusText)}</div>`);
  activeTab = await getActiveTab();
  if (activeTab?.id) await collectQuestions(activeTab.id);

  const response = await browser.runtime.sendMessage({
    type: 'comp:get-panel-state',
    tabId: activeTab?.id ?? -1,
    url: activeTab?.url,
    host: activeTab?.url ? getHost(activeTab.url) : undefined,
  });
  if (!isPanelStateResponse(response)) {
    appRoot.innerHTML = shell(unauthenticatedHtml(getResponseError(response)));
    bindSignIn();
    return;
  }

  panelState = response.panelState;
  if (panelState.auth.status !== 'authenticated') {
    appRoot.innerHTML = shell(unauthenticatedHtml('Sign in to use Comp answers.'));
    bindSignIn();
    return;
  }

  appRoot.innerHTML = shell(authenticatedHtml(panelState));
  bindAuthenticatedControls();
}

function shell(body: string): string {
  return `
    <div class="shell">
      <div class="header">
        <span class="brand-mark" aria-hidden="true">${compMarkSvg()}</span>
        <div>
          <h1 class="title">Comp AI Questionnaire</h1>
          <p class="subtitle">Review answers before anything is inserted.</p>
        </div>
        <span class="connected">Connected</span>
      </div>
      ${body}
    </div>
  `;
}

function unauthenticatedHtml(message: string): string {
  return `
    <div class="section">
      <div class="status">${escapeHtml(message)}</div>
      <button class="button button-primary" data-action="sign-in">Sign in to Comp</button>
      <button class="button button-secondary" data-action="refresh">Refresh</button>
    </div>
  `;
}

function authenticatedHtml(state: PanelState): string {
  const selected = state.auth.selectedOrganizationId ?? '';
  const orgOptions = state.auth.organizations
    .map(
      (org) =>
        `<option value="${escapeHtml(org.id)}" ${
          org.id === selected ? 'selected' : ''
        }>${escapeHtml(org.name)}</option>`,
    )
    .join('');
  const actionDisabled = selected ? '' : 'disabled';
  const detectClass = state.detectionEnabled ? 'toggle' : 'toggle off';

  return `
    <div class="section">
      <label class="label" for="org-select">Active workspace</label>
      <select class="select" id="org-select">${orgOptions}</select>
      <p class="muted">${escapeHtml(state.auth.user?.email ?? '')}</p>
    </div>
    <div class="section">
      <div class="toggle-row">
        <div>
          <div class="label no-margin">Detect questions</div>
          <p class="muted">${state.queue.items.length} found on this page</p>
        </div>
        <button class="${detectClass}" data-action="toggle-detection" aria-label="Toggle detection"></button>
      </div>
      <button class="button button-primary block" data-action="open-panel" ${actionDisabled}>Open review panel</button>
      <p class="helper">Answers preview before they're inserted. Nothing is written automatically.</p>
    </div>
    <div class="actions">
      <button class="button button-secondary" data-action="refresh">Refresh</button>
    </div>
  `;
}

function bindSignIn(): void {
  appRoot.querySelector('[data-action="sign-in"]')?.addEventListener('click', () => {
    void browser.runtime.sendMessage({ type: 'comp:open-sign-in' });
  });
  bindRefresh();
}

function bindAuthenticatedControls(): void {
  bindRefresh();
  const select = appRoot.querySelector('#org-select');
  if (select instanceof HTMLSelectElement) {
    select.addEventListener('change', () => {
      if (select.value) void handleOrgChange(select.value);
    });
  }
  appRoot.querySelector('[data-action="open-panel"]')?.addEventListener('click', () => {
    void handleOpenPanel();
  });
  appRoot.querySelector('[data-action="toggle-detection"]')?.addEventListener('click', () => {
    void handleDetectionToggle();
  });
}

function bindRefresh(): void {
  appRoot.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
    void render('Refreshing...');
  });
}

async function handleOrgChange(organizationId: string): Promise<void> {
  const response = await browser.runtime.sendMessage({
    type: 'comp:set-active-org',
    organizationId,
    tabId: activeTab?.id,
  });
  if (!isOkResponse(response)) {
    appRoot.innerHTML = shell(`<div class="status">${escapeHtml(getResponseError(response))}</div>`);
    return;
  }
  await render('Workspace updated.');
}

async function handleOpenPanel(): Promise<void> {
  if (!activeTab?.id) return;
  await browser.runtime.sendMessage({
    type: 'comp:open-side-panel',
    tabId: activeTab.id,
    windowId: activeTab.windowId,
  });
  window.close();
}

async function handleDetectionToggle(): Promise<void> {
  if (!panelState || !activeTab?.id) return;
  const enabled = !panelState.detectionEnabled;
  await browser.runtime.sendMessage({
    type: 'comp:set-detection-enabled',
    host: panelState.queue.host,
    enabled,
  });
  await browser.tabs.sendMessage(activeTab.id, {
    type: 'comp:set-detection-enabled',
    enabled,
  }).catch(() => undefined);
  await render(enabled ? 'Detection enabled.' : 'Detection disabled.');
}

async function collectQuestions(tabId: number): Promise<void> {
  await browser.tabs.sendMessage(tabId, { type: 'comp:collect-questions' }).catch(() => undefined);
}

async function getActiveTab(): Promise<Browser.tabs.Tab | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

function getHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'current page';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isAuthUpdate(value: unknown): value is { type: 'comp:auth-updated' } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'comp:auth-updated';
}

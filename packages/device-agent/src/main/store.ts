import { app } from 'electron';
import Store from 'electron-store';
import type { CheckResult, StoredAuth } from '../shared/types';

declare const __PORTAL_URL__: string;
declare const __API_URL__: string;

interface StoreSchema {
  auth: StoredAuth | null;
  portalUrl: string;
  apiUrl: string;
  lastCheckResults: CheckResult[];
  checkIntervalMs: number;
  openAtLogin: boolean;
}

const isDev = !app.isPackaged;
const defaultPortalUrl = isDev ? 'http://localhost:3002' : __PORTAL_URL__;
const defaultApiUrl = isDev ? 'http://localhost:3333' : __API_URL__;

const store = new Store<StoreSchema>({
  name: 'comp-device-agent',
  encryptionKey: 'comp-device-agent-v1',
  defaults: {
    auth: null,
    portalUrl: defaultPortalUrl,
    apiUrl: defaultApiUrl,
    lastCheckResults: [],
    checkIntervalMs: 60 * 60 * 1000, // 1 hour
    openAtLogin: true,
  },
});

// Always sync URLs with the current environment so dev
// doesn't accidentally keep a cached production URL (or vice-versa).
if (store.get('portalUrl') !== defaultPortalUrl) {
  store.set('portalUrl', defaultPortalUrl);
  // Clear auth too since the session token is for the old portal
  store.set('auth', null);
}
if (store.get('apiUrl') !== defaultApiUrl) {
  store.set('apiUrl', defaultApiUrl);
}

export function getAuth(): StoredAuth | null {
  return store.get('auth');
}

export function setAuth(auth: StoredAuth): void {
  store.set('auth', auth);
}

export function clearAuth(): void {
  store.set('auth', null);
  store.set('lastCheckResults', []);
}

export function getPortalUrl(): string {
  return store.get('portalUrl');
}

export function setPortalUrl(url: string): void {
  store.set('portalUrl', url);
}

export function getApiUrl(): string {
  return store.get('apiUrl');
}

export function setApiUrl(url: string): void {
  store.set('apiUrl', url);
}

export function getLastCheckResults(): CheckResult[] {
  return store.get('lastCheckResults');
}

export function setLastCheckResults(results: CheckResult[]): void {
  store.set('lastCheckResults', results);
}

export function getCheckInterval(): number {
  return store.get('checkIntervalMs');
}

export function getOpenAtLogin(): boolean {
  return store.get('openAtLogin');
}

export function setOpenAtLogin(value: boolean): void {
  store.set('openAtLogin', value);
}

export default store;

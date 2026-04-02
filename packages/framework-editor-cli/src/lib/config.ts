import Conf from 'conf';
import type { StoredCredentials } from '../types.js';

const DEFAULT_API_URL = 'http://localhost:3333';

const store = new Conf<StoredCredentials>({
  projectName: 'comp-framework-cli',
  encryptionKey: 'comp-framework-cli-v1',
  defaults: {
    sessionToken: '',
    userId: '',
    apiUrl: DEFAULT_API_URL,
  },
});

export function getSessionToken(): string | null {
  const envToken = process.env['COMP_SESSION_TOKEN'];
  if (envToken) return envToken;

  const stored = store.get('sessionToken');
  return stored || null;
}

export function getApiUrl(override?: string): string {
  if (override) return override;
  return process.env['COMP_API_URL'] ?? store.get('apiUrl') ?? DEFAULT_API_URL;
}

export function getPortalUrl(apiUrl: string): string {
  if (process.env['COMP_PORTAL_URL']) return process.env['COMP_PORTAL_URL'];
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    return 'http://localhost:3002';
  }
  return apiUrl.replace('api.', 'portal.');
}

export function saveCredentials(sessionToken: string, userId: string, apiUrl: string): void {
  store.set('sessionToken', sessionToken);
  store.set('userId', userId);
  store.set('apiUrl', apiUrl);
}

export function clearCredentials(): void {
  store.clear();
}

export function getStoredCredentials(): StoredCredentials | null {
  const token = store.get('sessionToken');
  if (!token) return null;
  return {
    sessionToken: token,
    userId: store.get('userId'),
    apiUrl: store.get('apiUrl'),
  };
}

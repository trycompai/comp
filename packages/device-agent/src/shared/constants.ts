/** Default portal base URL - overridden by stored config */
export const DEFAULT_PORTAL_URL = 'https://portal.trycomp.ai';

/** How often to run compliance checks (in milliseconds) */
export const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** Agent version reported to the server */
export const AGENT_VERSION = '1.0.0';

/** API route paths on the portal */
export const API_ROUTES = {
  REGISTER: '/api/device-agent/register',
  CHECK_IN: '/api/device-agent/check-in',
  STATUS: '/api/device-agent/status',
  MY_ORGANIZATIONS: '/api/device-agent/my-organizations',
} as const;

/** Auth callback path used by the Electron BrowserWindow login flow */
export const AUTH_CALLBACK_PATH = '/api/auth/get-session';

/** electron-store encryption key identifier */
export const STORE_ENCRYPTION_KEY = 'comp-device-agent-store';

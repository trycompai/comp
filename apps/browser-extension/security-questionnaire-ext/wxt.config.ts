import { readFileSync } from 'node:fs';
import { defineConfig } from 'wxt';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function readEnv(name: string): string | undefined {
  return process.env[name] ?? readDotEnv()[name];
}

function readDotEnv(): Record<string, string> {
  try {
    const text = readFileSync(new URL('.env', import.meta.url), 'utf8');
    return Object.fromEntries(
      text.split(/\r?\n/).flatMap((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return [];
        const separator = trimmed.indexOf('=');
        if (separator <= 0) return [];
        return [[trimmed.slice(0, separator), trimmed.slice(separator + 1)]];
      }),
    );
  } catch {
    return {};
  }
}

function normalizeExtensionKey(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^[a-p]{32}$/.test(trimmed) ? undefined : trimmed;
}

const apiBaseUrl = trimTrailingSlash(
  readEnv('WXT_PUBLIC_API_BASE_URL') ?? 'http://localhost:3333',
);
const appBaseUrl = trimTrailingSlash(
  readEnv('WXT_PUBLIC_APP_BASE_URL') ?? 'http://localhost:3000',
);
const extensionKey = normalizeExtensionKey(readEnv('WXT_EXTENSION_KEY'));
const googleOAuthClientId = readEnv('WXT_GOOGLE_OAUTH_CLIENT_ID');
const googleSheetsScope = 'https://www.googleapis.com/auth/spreadsheets';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  dev: {
    server: {
      port: 3100,
      strictPort: true,
    },
  },
  manifest: {
    name: 'Comp AI Security Questionnaire',
    description:
      'Generate and insert security questionnaire answers from Comp AI.',
    permissions: [
      'activeTab',
      'clipboardWrite',
      ...(googleOAuthClientId ? ['identity'] : []),
      'scripting',
      'storage',
      'tabs',
    ],
    host_permissions: [
      '<all_urls>',
      `${apiBaseUrl}/*`,
      `${appBaseUrl}/*`,
      'https://api.staging.trycomp.ai/*',
      'https://app.staging.trycomp.ai/*',
    ],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
      default_title: 'Comp AI Security Questionnaire',
    },
    ...(googleOAuthClientId
      ? {
          oauth2: {
            client_id: googleOAuthClientId,
            scopes: [googleSheetsScope],
          },
        }
      : {}),
    ...(extensionKey ? { key: extensionKey } : {}),
  },
});

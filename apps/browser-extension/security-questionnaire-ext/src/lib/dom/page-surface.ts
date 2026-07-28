import { extensionConfig } from '../config';
import type { QuestionnaireSurface } from '../types';

interface PageLocation {
  host: string;
  hostname: string;
  pathname: string;
}

export function getPageSurface(location: PageLocation): QuestionnaireSurface {
  if (
    location.hostname === 'docs.google.com' &&
    location.pathname.startsWith('/document/')
  ) {
    return 'docs';
  }
  if (
    location.hostname === 'docs.google.com' &&
    location.pathname.startsWith('/spreadsheets/')
  ) {
    return 'sheets';
  }
  if (
    location.hostname === 'docs.google.com' &&
    location.pathname.startsWith('/forms/')
  ) {
    return 'forms';
  }
  return 'generic';
}

export function shouldSkipQuestionnaireInjection(location: PageLocation): boolean {
  const protectedHosts = new Set([
    getUrlHost(extensionConfig.appBaseUrl),
    getUrlHost(extensionConfig.apiBaseUrl),
    'app.trycomp.ai',
    'api.trycomp.ai',
    'app.staging.trycomp.ai',
    'api.staging.trycomp.ai',
  ]);
  return protectedHosts.has(location.host) || isAssistantHost(location.hostname);
}

function getUrlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function isAssistantHost(hostname: string): boolean {
  const assistantHosts = [
    'chatgpt.com',
    'chat.openai.com',
    'claude.ai',
    'gemini.google.com',
    'copilot.microsoft.com',
    'perplexity.ai',
    'poe.com',
  ];

  return assistantHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
}

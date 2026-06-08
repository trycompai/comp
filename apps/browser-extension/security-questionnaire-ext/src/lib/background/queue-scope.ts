import { getPageSurface } from '../dom/page-surface';
import { parseSheetIdentityFromUrl } from '../sheet-mapping';
import type { TabQuestionQueue } from '../types';

export function shouldResetQueueForUrl(params: {
  queue: TabQuestionQueue | null;
  url?: string;
}): boolean {
  if (!params.queue || !params.url) return false;
  const existingScope = getQueueScope(params.queue.url);
  const nextScope = getQueueScope(params.url);
  return Boolean(existingScope && nextScope && existingScope !== nextScope);
}

export function getQueueSurface(url?: string): TabQuestionQueue['surface'] {
  if (!url) return 'generic';
  try {
    return getPageSurface(new URL(url));
  } catch {
    return 'generic';
  }
}

export function getQueueHost(url?: string): string {
  if (!url) return 'current page';
  try {
    return new URL(url).host;
  } catch {
    return 'current page';
  }
}

export function getQueueScope(url: string): string | null {
  try {
    const parsed = new URL(url);
    const surface = getPageSurface(parsed);
    if (surface === 'sheets') {
      const identity = parseSheetIdentityFromUrl(url);
      return identity
        ? `sheets:${identity.spreadsheetId}:${identity.gid}`
        : `sheets:${parsed.origin}${parsed.pathname}${parsed.hash}`;
    }
    if (surface === 'docs' || surface === 'forms') {
      return `${surface}:${parsed.origin}${parsed.pathname}`;
    }
    return `${surface}:${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

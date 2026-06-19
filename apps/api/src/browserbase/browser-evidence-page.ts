import type { BrowserbaseSessionService } from './browserbase-session.service';
import { normalizeHostnameFromUrl } from './browserbase-url';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;
type EvidencePage = Awaited<
  ReturnType<BrowserbaseSessionService['ensureActivePage']>
>;

export async function resolveEvidencePage({
  stagehand,
  initialPage,
  targetUrl,
}: {
  stagehand: Stagehand;
  initialPage: EvidencePage;
  targetUrl: string;
}): Promise<EvidencePage> {
  if (!isEvidencePageClosed(initialPage)) {
    await bringEvidencePageToFront(initialPage);
    return initialPage;
  }

  const targetHostname = safeHostname(targetUrl);
  const matchingPage = stagehand.context.pages().find((candidate) => {
    if (isEvidencePageClosed(candidate)) return false;
    return (
      targetHostname !== null &&
      safeHostname(candidate.url()) === targetHostname
    );
  });

  if (matchingPage) {
    await bringEvidencePageToFront(matchingPage);
    return matchingPage;
  }

  const [fallbackPage] = stagehand.context
    .pages()
    .filter((candidate) => !isEvidencePageClosed(candidate));
  if (fallbackPage) {
    await bringEvidencePageToFront(fallbackPage);
    return fallbackPage;
  }

  return initialPage;
}

export async function bringEvidencePageToFront(
  page: EvidencePage,
): Promise<void> {
  const focusable = getFocusablePage(page);
  if (focusable) await focusable.bringToFront();
}

function isEvidencePageClosed(page: EvidencePage): boolean {
  const closable = getClosablePage(page);
  return closable ? closable.isClosed() : false;
}

function getClosablePage(
  page: EvidencePage,
): { isClosed: () => boolean } | null {
  if (!hasMethod(page, 'isClosed')) return null;
  return { isClosed: () => Boolean(page.isClosed()) };
}

function getFocusablePage(
  page: EvidencePage,
): { bringToFront: () => Promise<void> } | null {
  if (!hasMethod(page, 'bringToFront')) return null;
  return {
    bringToFront: async () => {
      await page.bringToFront();
    },
  };
}

function hasMethod<K extends string>(
  value: unknown,
  key: K,
): value is Record<K, () => unknown> {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return false;
  }
  const record = value as Record<K, unknown>;
  return typeof record[key] === 'function';
}

function safeHostname(url: string): string | null {
  try {
    return normalizeHostnameFromUrl(url);
  } catch {
    return null;
  }
}

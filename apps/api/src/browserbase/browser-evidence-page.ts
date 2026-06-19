import type { BrowserbaseSessionService } from './browserbase-session.service';
import { normalizeHostnameFromUrl } from './browserbase-url';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;
type EvidencePage = Awaited<
  ReturnType<BrowserbaseSessionService['ensureActivePage']>
>;

interface EvidencePageCandidate {
  url(): string;
}

export async function resolveEvidencePage({
  stagehand,
  initialPage,
  targetUrl,
}: {
  stagehand: Stagehand;
  initialPage: EvidencePage;
  targetUrl: string;
}): Promise<EvidencePage> {
  const selectedPage = selectEvidencePage({
    pages: stagehand.context.pages(),
    initialPage,
    targetUrl,
    isClosed: isEvidencePageClosed,
  });

  if (!selectedPage) {
    throw new Error('Browser session ended before evidence capture.');
  }

  await bringEvidencePageToFront(selectedPage);
  return selectedPage;
}

export function selectEvidencePage<Page extends EvidencePageCandidate>({
  pages,
  initialPage,
  targetUrl,
  isClosed,
}: {
  pages: Page[];
  initialPage: Page;
  targetUrl: string;
  isClosed: (page: Page) => boolean;
}): Page | null {
  const openPages = pages.filter((page) => !isClosed(page));
  const targetHostname = safeHostname(targetUrl);
  const openMatchesTarget = (page: Page) =>
    targetHostname !== null && safeHostname(page.url()) === targetHostname;

  const newestMatchingNewPage = [...openPages]
    .reverse()
    .find((page) => page !== initialPage && openMatchesTarget(page));
  if (newestMatchingNewPage) return newestMatchingNewPage;

  if (!isClosed(initialPage)) return initialPage;

  const newestMatchingPage = [...openPages].reverse().find(openMatchesTarget);
  if (newestMatchingPage) return newestMatchingPage;

  return openPages.at(-1) ?? null;
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

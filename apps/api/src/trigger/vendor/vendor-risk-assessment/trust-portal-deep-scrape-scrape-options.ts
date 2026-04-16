import type { DeepScrapeSection } from './trust-portal-deep-scrape-sections';

/**
 * Builders for the two kinds of Firecrawl `scrape` requests the trust-portal
 * deep-scrape issues — the initial full-page pull, and the per-section pull
 * that may need to click a sidebar item (by href, CSS selector, or text) to
 * reveal the content.
 */

const INITIAL_WAIT_MS = 3000;
const CLICK_WAIT_BEFORE_MS = 1500;
const CLICK_WAIT_AFTER_MS = 2000;
const PATH_WAIT_MS = 2000;
// Firecrawl scrape v2 `timeout` is capped at 300000ms.
const SCRAPE_TIMEOUT_MS = 120_000;

/** Escape `"` and `\` for use inside a CSS double-quoted attribute value. */
function cssEscapeAttr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * JS payload that finds the smallest visible DOM element whose exact
 * textContent matches `tabLabel` and clicks it. Used when a trust portal
 * sidebar is composed of buttons/divs without href attributes.
 */
function buildClickByTextScript(tabLabel: string): string {
  const safe = JSON.stringify(tabLabel);
  return `(() => {
  const label = ${safe};
  const candidates = Array.from(
    document.querySelectorAll(
      'button, a, [role="tab"], [role="button"], [role="menuitem"], li, span, div'
    )
  )
    .filter((el) => {
      if (!el || typeof el.textContent !== 'string') return false;
      if (el.textContent.trim() !== label) return false;
      if (el.children && el.children.length > 2) return false;
      if (typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
      }
      return true;
    })
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
  const target = candidates[0];
  if (target) {
    try { target.scrollIntoView({ block: 'center' }); } catch {}
    target.click();
  }
})();`;
}

export function buildInitialScrapeOptions() {
  return {
    formats: ['markdown', 'links'] as const,
    onlyMainContent: false,
    timeout: SCRAPE_TIMEOUT_MS,
    actions: [{ type: 'wait', milliseconds: INITIAL_WAIT_MS }],
  };
}

export function buildSectionScrapeOptions(section: DeepScrapeSection) {
  if (section.tabLabel) {
    return {
      formats: ['markdown'] as const,
      onlyMainContent: true,
      timeout: SCRAPE_TIMEOUT_MS,
      actions: [
        { type: 'wait', milliseconds: CLICK_WAIT_BEFORE_MS },
        {
          type: 'executeJavascript',
          script: buildClickByTextScript(section.tabLabel),
        },
        { type: 'wait', milliseconds: CLICK_WAIT_AFTER_MS },
      ],
    };
  }

  if (section.anchor) {
    const safeAnchor = cssEscapeAttr(section.anchor);
    const safeLabel = cssEscapeAttr(section.label);
    const selector = [
      `a[href="${safeAnchor}"]`,
      `a[href$="${safeAnchor}"]`,
      `[data-tab="${safeLabel}"]`,
    ].join(', ');
    return {
      formats: ['markdown'] as const,
      onlyMainContent: true,
      timeout: SCRAPE_TIMEOUT_MS,
      actions: [
        { type: 'wait', milliseconds: CLICK_WAIT_BEFORE_MS },
        { type: 'click', selector },
        { type: 'wait', milliseconds: CLICK_WAIT_AFTER_MS },
      ],
    };
  }

  return {
    formats: ['markdown'] as const,
    onlyMainContent: true,
    timeout: SCRAPE_TIMEOUT_MS,
    actions: [{ type: 'wait', milliseconds: PATH_WAIT_MS }],
  };
}

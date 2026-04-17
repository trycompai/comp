// Pure helper: convert a Firecrawl scrape's `links` array into an ordered,
// deduped list of section URLs for the trust-portal deep-scrape pass.
//
// A "section URL" is either:
//   - an intra-page anchor on the same path as the source URL (e.g. `/trust-center#cloud-security`)
//   - a same-origin URL whose path is nested under the source path (e.g. `/trust-center/cloud-security`)
//
// Cross-origin links, the source URL itself, and duplicates are dropped.

export const MAX_SECTION_URLS = 25;

export type DeepScrapeSection = {
  url: string;
  /** The anchor fragment including the `#` (e.g. `#cloud-security`), or null for path-based sections. */
  anchor: string | null;
  /** A human-friendly label used for logging and markdown section headers. */
  label: string;
  /**
   * When present, the section must be revealed by clicking a DOM element whose
   * textContent equals this value. Used for SPA trust portals where sidebar
   * items are buttons/divs without href attributes (e.g. Ubiquiti).
   */
  tabLabel?: string | null;
};

function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

function deriveLabel(sectionUrl: URL, anchor: string | null): string {
  if (anchor) {
    return anchor.slice(1); // drop leading `#`
  }
  const segments = stripTrailingSlash(sectionUrl.pathname).split('/');
  return segments[segments.length - 1] || sectionUrl.pathname;
}

export function discoverSectionUrls(params: {
  sourceUrl: string;
  links: string[];
}): DeepScrapeSection[] {
  const { sourceUrl, links } = params;
  if (!links || links.length === 0) return [];

  let source: URL;
  try {
    source = new URL(sourceUrl);
  } catch {
    return [];
  }

  const sourceOrigin = source.origin;
  const sourcePath = stripTrailingSlash(source.pathname);
  const sourceCanonical = `${sourceOrigin}${sourcePath}`;

  const seen = new Set<string>();
  const sections: DeepScrapeSection[] = [];

  for (const raw of links) {
    if (sections.length >= MAX_SECTION_URLS) break;
    if (!raw || typeof raw !== 'string') continue;

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      continue;
    }

    if (parsed.origin !== sourceOrigin) continue;

    const parsedPath = stripTrailingSlash(parsed.pathname);
    const hasFragment = parsed.hash && parsed.hash.length > 1;

    const isIntraPageAnchor = parsedPath === sourcePath && hasFragment;
    const isSamePathChild =
      !hasFragment &&
      parsedPath !== sourcePath &&
      (parsedPath.startsWith(`${sourcePath}/`) ||
        (sourcePath === '' && parsedPath.startsWith('/')));

    if (!isIntraPageAnchor && !isSamePathChild) continue;

    const anchor = isIntraPageAnchor ? parsed.hash : null;
    const canonical = anchor
      ? `${sourceCanonical}${anchor}`
      : `${sourceOrigin}${parsedPath}`;

    if (canonical === sourceCanonical) continue;
    if (seen.has(canonical)) continue;
    seen.add(canonical);

    sections.push({
      url: canonical,
      anchor,
      label: deriveLabel(new URL(canonical), anchor),
    });
  }

  return sections;
}

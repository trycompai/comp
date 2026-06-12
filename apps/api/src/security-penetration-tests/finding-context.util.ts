/**
 * Pure helpers for pentest finding-context notes. Kept free of Nest/DB
 * imports so both the storage service and the run-creation path can use
 * them, and so they unit-test without mocks.
 */

export interface FindingContextNote {
  issueTitle: string;
  context: string;
}

/**
 * Canonical form of a scan target so notes written on a run match future
 * runs of the same target regardless of casing or a trailing slash
 * (`https://App.example.com/` ≡ `https://app.example.com`). Only the
 * path's trailing slashes are stripped — a `/` at the end of a query
 * value belongs to that value and must survive. Non-URL input is
 * returned trimmed — the create DTO already enforces a valid URL.
 */
export function normalizeTargetUrl(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    url.hash = '';
    while (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    const normalized = url.toString();
    // URL always renders the bare root path with a trailing slash
    // (`https://x.com/`); drop it for origin-only targets so keys stay
    // in the `https://x.com` form.
    return url.pathname === '/' && !url.search
      ? normalized.replace(/\/$/, '')
      : normalized;
  } catch {
    return trimmed;
  }
}

/**
 * Budget for the composed briefing. The provider has no documented limit
 * (verified against its OpenAPI spec and prompt-injection source), but an
 * unbounded string composed from arbitrarily many notes shouldn't be sent
 * to an external API or an agent prompt. When over budget, whole notes
 * are dropped — never cut mid-sentence — and an explicit omission marker
 * tells the agent the list is incomplete.
 */
export const MAX_ADDITIONAL_CONTEXT_LENGTH = 20_000;

const NOTES_HEADER =
  'Customer-provided context on findings reported in previous scans of this target. ' +
  'Take it into account when validating and reporting findings (e.g. behavior that is ' +
  'accepted by design, or issues the customer has since remediated):';

/**
 * Composes the `additionalContext` string sent to the pentest provider on
 * run creation: the user's free-text context for this run (if any) followed
 * by the stored per-finding notes from previous scans of the same target.
 * Returns undefined when there is nothing to send.
 */
export function buildAdditionalContext(params: {
  userProvidedContext?: string;
  findingContexts: FindingContextNote[];
}): string | undefined {
  const userSection = params.userProvidedContext?.trim();

  if (params.findingContexts.length === 0) {
    return userSection || undefined;
  }

  const noteLines = params.findingContexts.map(
    (note, index) =>
      `${index + 1}. "${note.issueTitle.trim()}": ${note.context.trim()}`,
  );

  const compose = (includedCount: number): string => {
    const omitted = noteLines.length - includedCount;
    const lines = noteLines.slice(0, includedCount);
    if (omitted > 0) {
      lines.push(
        `(${omitted} more note${omitted === 1 ? '' : 's'} omitted for length — see the finding context notes in Comp AI)`,
      );
    }
    const sections = userSection ? [userSection] : [];
    sections.push([NOTES_HEADER, ...lines].join('\n'));
    return sections.join('\n\n');
  };

  let included = noteLines.length;
  while (
    included > 0 &&
    compose(included).length > MAX_ADDITIONAL_CONTEXT_LENGTH
  ) {
    included -= 1;
  }

  return compose(included);
}

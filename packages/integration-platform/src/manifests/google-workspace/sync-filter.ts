/**
 * Google Workspace employee sync filter terms — shared by API sync and integration checks.
 * Terms may be full emails, @domain suffixes, or other patterns per Admin UI copy.
 */

export const parseGoogleWorkspaceSyncFilterTerms = (value: unknown): string[] => {
  const rawValues = Array.isArray(value)
    ? value.map((item) => String(item))
    : typeof value === 'string'
      ? [value]
      : [];

  return Array.from(
    new Set(
      rawValues
        .flatMap((item) => item.split(/[\n,;]+/))
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0),
    ),
  );
};

const isFullEmailTerm = (term: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(term);

const matchesGoogleWorkspaceSyncFilterTerm = (email: string, term: string): boolean => {
  if (email === term) {
    return true;
  }

  if (term.startsWith('@')) {
    return email.endsWith(term);
  }

  if (isFullEmailTerm(term)) {
    return false;
  }

  if (term.includes('@')) {
    return email.includes(term);
  }

  return email.endsWith(`@${term}`) || email.includes(term);
};

export const matchesGoogleWorkspaceSyncFilterTerms = (email: string, terms: string[]): boolean =>
  terms.some((term) => matchesGoogleWorkspaceSyncFilterTerm(email, term));

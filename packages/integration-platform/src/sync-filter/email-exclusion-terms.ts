/**
 * Email exclusion / inclusion terms for directory sync and checks (Google Workspace, JumpCloud, etc.).
 * Terms may be full emails, @domain suffixes, or other patterns per integration Admin UI copy.
 */

export const parseSyncFilterTerms = (value: unknown): string[] => {
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

/** Linear-time full-email shape check (avoids ReDoS from regex on user-controlled terms). */
const isFullEmailTerm = (term: string): boolean => {
  const at = term.indexOf('@');
  if (at <= 0) return false;
  if (term.indexOf('@', at + 1) !== -1) return false;

  const local = term.slice(0, at);
  const domain = term.slice(at + 1);
  if (local.length === 0 || domain.length === 0) return false;

  const segmentHasOnlyNonSpaceNonAt = (s: string): boolean => {
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === ' ' || ch === '@') return false;
    }
    return true;
  };

  if (!segmentHasOnlyNonSpaceNonAt(local) || !segmentHasOnlyNonSpaceNonAt(domain)) {
    return false;
  }

  const dotIdx = domain.lastIndexOf('.');
  if (dotIdx <= 0 || dotIdx >= domain.length - 1) return false;

  return true;
};

const matchesSyncFilterTerm = (email: string, term: string): boolean => {
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

export const matchesSyncFilterTerms = (email: string, terms: string[]): boolean =>
  terms.some((term) => matchesSyncFilterTerm(email, term));

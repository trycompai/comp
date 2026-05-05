// Public/free mailbox providers — domain ownership of these does NOT imply
// company affiliation, so they must never be used for domain-based auto-approval.
const PUBLIC_EMAIL_DOMAINS = new Set([
  // Google
  'gmail.com',
  'googlemail.com',
  // Microsoft
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  // Yahoo
  'yahoo.com',
  'ymail.com',
  // Apple
  'icloud.com',
  'me.com',
  'mac.com',
  // Proton
  'proton.me',
  'protonmail.com',
  'pm.me',
  // AOL
  'aol.com',
]);

export const isPublicEmailDomain = (domain: string): boolean => {
  const normalized = domain.toLowerCase().trim().replace(/\.$/, '');
  return PUBLIC_EMAIL_DOMAINS.has(normalized);
};

/**
 * Extract a normalized domain from either a website URL or an email address.
 * Returns null on empty/invalid input.
 */
export const extractDomain = (
  input: string | null | undefined,
): string | null => {
  if (!input) return null;

  try {
    if (input.includes('@') && !input.includes('://')) {
      const domain = input.split('@')[1]?.toLowerCase().trim();
      return domain || null;
    }

    let url = input.trim().toLowerCase();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

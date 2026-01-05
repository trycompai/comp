/**
 * Extract domain from website URL for GlobalVendors lookup.
 * Removes www. prefix and returns just the domain (e.g., "example.com").
 *
 * Examples:
 * - https://www.example.com/anything -> example.com
 * - https://example.com/            -> example.com
 * - http://www.example.com         -> example.com
 * - example.com (no protocol)      -> example.com
 */
export function extractDomain(website: string | null | undefined): string | null {
  if (!website) return null;

  const trimmed = website.trim();
  if (!trimmed) return null;

  try {
    // Add protocol if missing to make URL parsing work
    const urlString = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(urlString);
    // Remove www. prefix and return just the domain
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Canonical website key for GlobalVendors storage:
 * - Keeps protocol distinct (http vs https).
 * - Treats "www." and non-"www" as the same vendor (drops leading www.).
 * - Ignores path/query/hash (uses origin-style key).
 *
 * Examples:
 * - https://www.example.com/anything -> https://example.com
 * - https://example.com/            -> https://example.com
 * - http://www.example.com         -> http://example.com
 * - example.com (no protocol)      -> null (caller treats as invalid/missing)
 */
export function normalizeWebsite(website: string | null | undefined): string | null {
  if (!website) return null;

  const trimmed = website.trim();
  if (!trimmed) return null;

  // Require explicit protocol to avoid silently forcing https.
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const port = url.port ? `:${url.port}` : '';
    return `${protocol}//${hostname}${port}`;
  } catch {
    return null;
  }
}



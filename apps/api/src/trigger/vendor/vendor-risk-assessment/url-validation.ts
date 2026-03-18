import { logger } from '@trigger.dev/sdk';
import { getDomain } from 'tldts';

/**
 * Checks whether a URL belongs to the given vendor domain (including subdomains).
 * For example, if vendorDomain is "wix.com", accepts "wix.com", "www.wix.com",
 * "trust.wix.com", but rejects "x.com" or "notwix.com".
 */
export function isUrlFromVendorDomain(
  url: string,
  vendorDomain: string,
): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const domain = vendorDomain.toLowerCase();
    // Exact match or subdomain match (e.g., trust.wix.com for wix.com)
    return hostname === domain || hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

/**
 * Extracts the root registrable domain from a vendor website URL.
 * Strips subdomains (including www.) to return the base domain.
 * For example, "https://app.slack.com" → "slack.com".
 * Returns null if the URL is invalid.
 */
export function extractVendorDomain(
  website: string,
): string | null {
  try {
    const urlObj = new URL(
      /^https?:\/\//i.test(website) ? website : `https://${website}`,
    );
    const domain = getDomain(urlObj.hostname);
    return domain?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/**
 * Validates and filters a URL, ensuring it belongs to the vendor domain.
 * Returns null (with a warning log) if the URL is from a different domain.
 */
export function validateVendorUrl(
  url: string | null | undefined,
  vendorDomain: string,
  label: string,
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Normalize: add https if looks like a bare domain
  const looksLikeDomain =
    !/^https?:\/\//i.test(trimmed) &&
    /^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(trimmed);
  const candidate = looksLikeDomain ? `https://${trimmed}` : trimmed;

  try {
    const u = new URL(candidate);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const normalized = u.toString();

    if (!isUrlFromVendorDomain(normalized, vendorDomain)) {
      logger.warn('Filtered out URL from wrong domain', {
        vendorDomain,
        label,
        url: normalized,
      });
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

import { logger } from '@trigger.dev/sdk';
import { getDomain } from 'tldts';

// Well-known trust portal domains that vendors use to host their security pages
const TRUSTED_PORTAL_DOMAINS = [
  'trust.page',       // SafeBase
  'vanta.com',        // Vanta trust centers
  'drata.com',        // Drata trust centers
  'safebase.io',      // SafeBase
  'securityscorecard.com',
  'whistic.com',
  'conveyor.com',
  'trustcloud.ai',
  'scrut.io',
  'tugboatlogic.com',
  'laika.com',
];

/**
 * Checks whether a URL belongs to or is related to the given vendor domain.
 * Accepts:
 * - Exact domain match: github.com
 * - Subdomains: trust.github.com, security.github.com
 * - Third-party trust portals with vendor name in subdomain: ghec.github.trust.page
 * - Known trust portal domains with vendor name in the path or subdomain
 */
export function isUrlFromVendorDomain(
  url: string,
  vendorDomain: string,
): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const domain = vendorDomain.toLowerCase();
    const vendorName = domain.split('.')[0]!; // "github" from "github.com"

    // Direct match: github.com or *.github.com
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return true;
    }

    // Third-party trust portal with vendor name in hostname
    // e.g., ghec.github.trust.page, github.safebase.io
    if (hostname.includes(vendorName)) {
      const isKnownPortal = TRUSTED_PORTAL_DOMAINS.some(
        (portal) => hostname === portal || hostname.endsWith(`.${portal}`),
      );
      if (isKnownPortal) return true;
    }

    return false;
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
 * Validates a URL, ensuring it's a well-formed HTTP(S) URL.
 * No longer filters by domain — the Firecrawl agent is trusted to return
 * relevant URLs (vendors use custom trust portals on arbitrary domains).
 */
export function validateVendorUrl(
  url: string | null | undefined,
  _vendorDomain: string,
  _label: string,
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
    return u.toString();
  } catch {
    return null;
  }
}

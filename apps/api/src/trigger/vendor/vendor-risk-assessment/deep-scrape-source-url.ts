import type { VendorRiskAssessmentCertification } from './agent-types';

/**
 * Resolve the best "source URL" to feed into `deepScrapeTrustPortal`.
 *
 * Fallback order:
 *   1. The Agent-returned link labelled "Trust & Security" if it's on the vendor's domain.
 *   2. The Agent-returned link labelled "Security Overview" if it's on the vendor's domain.
 *   3. The URL of any verified certification that's on the vendor's domain.
 *
 * Returns null if nothing qualifies. Off-domain URLs are rejected at every tier —
 * `deepScrapeTrustPortal` applies an additional third-party-portal gate, but
 * this helper is the first line of defense against scraping an unrelated host.
 */
export function pickDeepScrapeSourceUrl(args: {
  vendorDomain: string;
  links: Array<{ label: string; url: string }>;
  certifications: VendorRiskAssessmentCertification[];
}): string | null {
  const { vendorDomain, links, certifications } = args;

  const isOnVendorDomain = (url: string): boolean => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === vendorDomain || host.endsWith(`.${vendorDomain}`);
    } catch {
      return false;
    }
  };

  const byLabel = (label: string) =>
    links.find((l) => l.label === label && isOnVendorDomain(l.url))?.url ??
    null;

  const trustUrl = byLabel('Trust & Security');
  if (trustUrl) return trustUrl;

  const securityUrl = byLabel('Security Overview');
  if (securityUrl) return securityUrl;

  for (const cert of certifications) {
    if (cert.status !== 'verified') continue;
    if (cert.url && isOnVendorDomain(cert.url)) return cert.url;
  }

  return null;
}

import Firecrawl from '@mendable/firecrawl-js';
import { logger } from '@trigger.dev/sdk';
import type { VendorRiskAssessmentCertification } from './agent-types';
import { isKnownThirdPartyPortalHost } from './url-validation';

export type DeepScrapeParams = {
  vendorName: string;
  vendorDomain: string;
  sourceUrl: string | null;
  firecrawlClient: Firecrawl;
};

/**
 * Deep-scrape a vendor-hosted trust portal / security page for compliance
 * certifications. Designed for SPAs (e.g. Ubiquiti's trust-center) that the
 * Firecrawl Agent misses because it can't click sidebar tabs. Returns null
 * when gated out or on any failure — caller falls back to Agent results.
 */
export async function deepScrapeTrustPortal(
  params: DeepScrapeParams,
): Promise<VendorRiskAssessmentCertification[] | null> {
  const { vendorName, vendorDomain, sourceUrl } = params;

  if (!sourceUrl) return null;

  let source: URL;
  try {
    source = new URL(sourceUrl);
  } catch {
    return null;
  }

  const host = source.hostname.toLowerCase();
  if (isKnownThirdPartyPortalHost(host)) {
    logger.info(
      'Trust portal deep-scrape skipped: third-party portal host already handled by agent',
      { vendorName, host },
    );
    return null;
  }

  const onVendorDomain =
    host === vendorDomain || host.endsWith(`.${vendorDomain}`);
  if (!onVendorDomain) {
    logger.info(
      'Trust portal deep-scrape skipped: source URL is not on vendor domain',
      { vendorName, host, vendorDomain },
    );
    return null;
  }

  // Further steps (initial scrape, section discovery, per-section scrapes,
  // AI extraction) are added in subsequent tasks.
  return null;
}

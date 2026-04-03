import Firecrawl from '@mendable/firecrawl-js';
import { logger } from '@trigger.dev/sdk';
import { extractVendorDomain } from './url-validation';

export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '') return null;

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

export function normalizeIso(date: string | null | undefined): string | null {
  if (!date) return null;
  const trimmed = date.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type FirecrawlSetup = {
  firecrawlClient: Firecrawl;
  origin: string;
  vendorDomain: string;
  seedUrls: string[];
};

export function setupFirecrawlClient(params: {
  vendorName: string;
  vendorWebsite: string;
}): FirecrawlSetup | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    logger.warn('FIRECRAWL_API_KEY is not configured; skipping vendor research');
    return null;
  }

  let origin: string;
  try {
    origin = new URL(params.vendorWebsite).origin;
  } catch {
    logger.warn('Invalid website URL provided to Firecrawl Agent', {
      vendorWebsite: params.vendorWebsite,
    });
    return null;
  }

  const vendorDomain = extractVendorDomain(params.vendorWebsite);
  if (!vendorDomain) {
    logger.warn('Could not extract vendor domain for URL validation', {
      vendorWebsite: params.vendorWebsite,
    });
    return null;
  }

  const firecrawlClient = new Firecrawl({ apiKey });

  const seedUrls = [
    origin,
    `${origin}/privacy`,
    `${origin}/privacy-policy`,
    `${origin}/terms`,
    `${origin}/terms-of-service`,
    `${origin}/security`,
    `${origin}/trust`,
    `${origin}/legal`,
    `${origin}/compliance`,
  ];

  return { firecrawlClient, origin, vendorDomain, seedUrls };
}

export function handleFirecrawlError(
  error: unknown,
  context: { vendorName: string; vendorWebsite: string; callType: string },
): null {
  const message = error instanceof Error ? error.message : String(error);
  const isBillingOrRateLimit =
    message.includes('402') ||
    message.includes('429') ||
    message.includes('Payment Required') ||
    message.includes('Rate') ||
    message.includes('Too Many Requests');

  if (isBillingOrRateLimit) {
    logger.error(`Firecrawl API billing or rate limit error (${context.callType})`, {
      vendorName: context.vendorName,
      vendorWebsite: context.vendorWebsite,
      error: message,
    });
    throw error;
  }

  logger.error(`Firecrawl Agent SDK call failed (${context.callType})`, {
    vendorName: context.vendorName,
    vendorWebsite: context.vendorWebsite,
    error: message,
  });
  return null;
}

import { logger } from '@trigger.dev/sdk';
import { firecrawlVendorDataSchema, type FirecrawlVendorData } from './schema';

type FirecrawlStartResponse = {
  success: boolean;
  id?: string;
};

type FirecrawlStatusResponse = {
  status?: 'processing' | 'completed' | 'failed' | 'cancelled';
  data?: unknown;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let trimmed = url.trim();
  if (!trimmed || trimmed === '') return null;

  // If it looks like a domain but missing scheme, assume https
  if (!/^https?:\/\//i.test(trimmed) && /^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const urlObj = new URL(trimmed);
    // Ensure it's http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }
    return urlObj.toString();
  } catch {
    // Reject if it's just a path without domain (Firecrawl should return absolute URLs)
    if (trimmed.startsWith('/') && !trimmed.startsWith('http')) {
      logger.warn('Rejecting relative URL from Firecrawl', { url: trimmed });
      return null;
    }
    return null;
  }
}

export async function firecrawlExtractVendorData(
  website: string,
): Promise<FirecrawlVendorData | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    logger.warn('FIRECRAWL_API_KEY is not configured; skipping vendor research');
    return null;
  }

  // Extract origin to crawl entire domain
  let origin: string;
  try {
    origin = new URL(website).origin;
  } catch {
    logger.warn('Invalid website URL provided to Firecrawl', { website });
    return null;
  }

  const initialResponse = await fetch('https://api.firecrawl.dev/v1/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
      body: JSON.stringify({
        urls: [`${origin}/*`],
        prompt: `You are a security analyst collecting SOC 2 + ISO 27001 evidence links for a third-party risk assessment.

Goal: return the MOST SPECIFIC, DIRECT URL for each document type below. Do not return general category pages.

You may crawl the site (including subdomains) and follow internal links. Trust portals are often linked in the header/footer under: "Trust", "Trust Center", "Security", "Compliance", "Legal", "Governance", "Privacy", "Data Processing", "DPA".

Return ONLY absolute https URLs. If you cannot find a dedicated page that matches the definition, return an empty string.

DEFINITIONS (be strict):
1) trust_portal_url:
   - Must be a dedicated trust/security/compliance portal page (often titled "Trust Center" / "Trust Portal" / "Security & Compliance")
   - Typically includes downloadable/requestable artifacts (SOC reports, ISO certs, pen test summaries, security questionnaires, DPA)
   - Accept: trust.<domain>, <domain>/trust, <domain>/trust-center, <domain>/security/trust-center, or a clearly vendor-branded hosted trust portal.
   - Reject: generic "/security" marketing overview, security blog posts, or a broad "Security" page that only describes practices.

2) soc2_report_url:
   - Must be the specific SOC 2 download page or request form page where a customer can obtain the SOC 2 Type I/II report.
   - If the SOC 2 report is only available behind a trust portal/login and there is no dedicated public SOC 2 page, leave this empty (do NOT guess).

3) privacy_policy_url:
   - Must be the dedicated Privacy Policy document page (usually /privacy or /privacy-policy). Reject generic /legal hubs.

4) terms_of_service_url:
   - Must be the dedicated Terms / Terms of Service / Terms of Use page. Reject generic /legal hubs.

5) security_overview_url:
   - Must be a dedicated security overview page describing controls/practices (encryption, IAM, incident response, etc.), not a single blog post.

When multiple candidates exist, choose the most direct URL that best matches the definition (prefer exact "trust center"/"privacy policy"/"terms"/"SOC 2 report" pages).`,
      schema: {
        type: 'object',
        properties: {
          company_description: {
            type: 'string',
            description: 'Brief 1-2 sentence description of what the company does and their main services/products',
          },
          privacy_policy_url: {
            type: 'string',
            description:
              'EXACT URL to the privacy policy document page. Must be a dedicated privacy policy page (typically /privacy, /privacy-policy, or /legal/privacy), NOT a general legal or terms page. Return empty string if not found.',
          },
          terms_of_service_url: {
            type: 'string',
            description:
              'EXACT URL to the terms of service/terms of use document page. Must be a dedicated terms page (typically /terms, /terms-of-service, /legal/terms), NOT a general legal page. Return empty string if not found.',
          },
          security_overview_url: {
            type: 'string',
            description:
              'EXACT URL to a dedicated security overview/security features page that describes their security practices, controls, and architecture. Must be a comprehensive security page, NOT just a blog post. Return empty string if not found.',
          },
          trust_portal_url: {
            type: 'string',
            description:
              'EXACT URL to the dedicated trust center/trust portal page. This is a COMPLIANCE PORTAL that provides security certifications, compliance documentation, SOC reports, security questionnaires, and audit reports. Common patterns: /trust, /trust-center, /security/trust, /compliance, /security/compliance. DO NOT return general security pages like /security or /security/overview - only return if there is a dedicated trust/compliance portal. Return empty string if no dedicated trust portal exists.',
          },
          soc2_report_url: {
            type: 'string',
            description:
              'EXACT URL to the SOC 2 report download page, request form, or dedicated SOC 2 report page. This should be where customers can download or request SOC 2 Type I/Type II reports. Often found in trust centers or security portals. Must be the specific SOC 2 report page, NOT just a mention of SOC 2 compliance. Return empty string if not found.',
          },
          certified_security_frameworks: {
            type: 'array',
            items: { type: 'string' },
            description:
              'List of security frameworks the vendor is certified for or claims compliance with (e.g., "SOC 2 Type II", "ISO 27001", "ISO 27017", "HIPAA", "GDPR", "PCI DSS"). Only include frameworks explicitly mentioned with certification/compliance claims.',
          },
        },
      },
        enableWebSearch: true,
        includeSubdomains: true,
        showSources: true,
        scrapeOptions: {
          onlyMainContent: false,
          removeBase64Images: true,
        },
      }),
    });

  const initialData = (await initialResponse.json()) as FirecrawlStartResponse;
  if (!initialData.success || !initialData.id) {
    logger.warn('Firecrawl failed to start extraction', { website, initialData });
    return null;
  }

  const jobId = initialData.id;
  const maxWaitTime = 1000 * 60 * 5;
  const pollInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    await sleep(pollInterval);

    const statusResponse = await fetch(
      `https://api.firecrawl.dev/v1/extract/${jobId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    const statusData = (await statusResponse.json()) as FirecrawlStatusResponse;

    if (statusData.status === 'completed') {
      const parsed = firecrawlVendorDataSchema.safeParse(statusData.data);
      if (!parsed.success) {
        logger.warn('Firecrawl completed but returned invalid data shape', {
          website,
          issues: parsed.error.issues,
        });
        return null;
      }

      const normalized = {
        ...parsed.data,
        privacy_policy_url: normalizeUrl(parsed.data.privacy_policy_url),
        terms_of_service_url: normalizeUrl(parsed.data.terms_of_service_url),
        security_overview_url: normalizeUrl(parsed.data.security_overview_url),
        trust_portal_url: normalizeUrl(parsed.data.trust_portal_url),
        soc2_report_url: normalizeUrl(parsed.data.soc2_report_url),
      };

      logger.info('Firecrawl extraction completed', {
        website,
        foundUrls: {
          privacy_policy: normalized.privacy_policy_url,
          terms_of_service: normalized.terms_of_service_url,
          security_overview: normalized.security_overview_url,
          trust_portal: normalized.trust_portal_url,
          soc2_report: normalized.soc2_report_url,
        },
        frameworks: normalized.certified_security_frameworks,
      });

      return normalized;
    }

    if (statusData.status === 'failed' || statusData.status === 'cancelled') {
      logger.warn('Firecrawl extraction did not complete', { website, jobId, statusData });
      return null;
    }
  }

  logger.warn('Firecrawl extraction timed out', { website, jobId });
  return null;
}



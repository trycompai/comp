import Firecrawl from '@mendable/firecrawl-js';
import { logger } from '@trigger.dev/sdk';
import { vendorRiskAssessmentAgentSchema } from './agent-schema';
import type { VendorRiskAssessmentDataV1 } from './agent-types';

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed === '') return null;

  const looksLikeDomain =
    !/^https?:\/\//i.test(trimmed) && /^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(trimmed);
  const candidate = looksLikeDomain ? `https://${trimmed}` : trimmed;

  try {
    const u = new URL(candidate);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function normalizeIso(date: string | null | undefined): string | null {
  if (!date) return null;
  const trimmed = date.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function firecrawlAgentVendorRiskAssessment(params: {
  vendorName: string;
  vendorWebsite: string;
}): Promise<VendorRiskAssessmentDataV1 | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    logger.warn('FIRECRAWL_API_KEY is not configured; skipping vendor research');
    return null;
  }

  const { vendorName, vendorWebsite } = params;

  let origin: string;
  try {
    origin = new URL(vendorWebsite).origin;
  } catch {
    logger.warn('Invalid website URL provided to Firecrawl Agent', { vendorWebsite });
    return null;
  }

  const firecrawlClient = new Firecrawl({ apiKey });

  const prompt = `Complete cyber security research on the vendor "${vendorName}" with website ${vendorWebsite}.

Extract the following information:
1. **Certifications**: Find any security certifications they have (SOC 2 Type I, SOC 2 Type II, ISO 27001 etc). For each certification found, determine:
   - The type of certification
   - Whether it's verified/current, expired, or not certified
   - Any issue or expiry dates mentioned
   - Link to the compliance/trust page or report if available

2. **Legal & Security Documents**: Find the direct URLs to:
   - Privacy Policy page (usually at /privacy, /privacy-policy, or linked in the footer)
   - Terms of Service page (usually at /terms, /tos, /terms-of-service, or linked in the footer)
   - Trust Center or Security page (typically could be at /trust, /security or trust.website.com or security.website.com)

3. **Recent News**: Find recent news articles (last 12 months) about the company, especially:
   - Security incidents or data breaches
   - Funding rounds or acquisitions
   - Lawsuits or regulatory actions
   - Major partnerships or product updates
   - Leadership changes

4. **Summary**: Provide an overall assessment of the vendor's security posture.

Focus on their official website (especially trust/security/compliance pages), press releases, and reputable news sources.`;

  // Using SDK (no maxCredits override, no explicit polling here)
  // Important: avoid crawling huge sites with a wildcard (e.g. workspace.google.com).
  const agentResponse = await firecrawlClient.agent({
    prompt,
    urls: [origin],
    schema: {
      type: 'object',
      properties: {
        risk_level: { type: 'string' },
        security_assessment: { type: 'string' },
        last_researched_at: { type: 'string' },
        certifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              status: {
                type: 'string',
                enum: ['verified', 'expired', 'not_certified', 'unknown'],
              },
              issued_at: { type: 'string' },
              expires_at: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['type'],
          },
        },
        links: {
          type: 'object',
          properties: {
            privacy_policy_url: { type: 'string' },
            terms_of_service_url: { type: 'string' },
            trust_center_url: { type: 'string' },
            security_page_url: { type: 'string' },
            soc2_report_url: { type: 'string' },
          },
        },
        news: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              title: { type: 'string' },
              summary: { type: 'string' },
              source: { type: 'string' },
              url: { type: 'string' },
              sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
            },
            required: ['date', 'title'],
          },
        },
      },
      required: ['security_assessment'],
    },
  });

  const parsed = vendorRiskAssessmentAgentSchema.safeParse(agentResponse.data);
  if (!parsed.success) {
    logger.warn('Firecrawl Agent SDK returned invalid data shape', {
      vendorWebsite,
      issues: parsed.error.issues,
    });
    return null;
  }

  const links = parsed.data.links ?? null;
  const linkPairs: Array<{ label: string; url: string }> = [];
  if (links?.trust_center_url) linkPairs.push({ label: 'Trust & Security', url: links.trust_center_url });
  if (links?.security_page_url) linkPairs.push({ label: 'Security Overview', url: links.security_page_url });
  if (links?.soc2_report_url) linkPairs.push({ label: 'SOC 2 Report', url: links.soc2_report_url });
  if (links?.privacy_policy_url) linkPairs.push({ label: 'Privacy Policy', url: links.privacy_policy_url });
  if (links?.terms_of_service_url) linkPairs.push({ label: 'Terms of Service', url: links.terms_of_service_url });

  const normalizedLinks = linkPairs
    .map((l) => ({ ...l, url: normalizeUrl(l.url) }))
    .filter((l): l is { label: string; url: string } => Boolean(l.url));

  const certifications =
    parsed.data.certifications?.map((c) => ({
      type: c.type,
      status: c.status ?? 'unknown',
      issuedAt: normalizeIso(c.issued_at ?? null),
      expiresAt: normalizeIso(c.expires_at ?? null),
      url: normalizeUrl(c.url ?? null),
    })) ?? [];

  const news =
    parsed.data.news?.map((n) => ({
      date: normalizeIso(n.date) ?? n.date,
      title: n.title,
      summary: n.summary ?? null,
      source: n.source ?? null,
      url: normalizeUrl(n.url ?? null),
      sentiment: n.sentiment ?? null,
    })) ?? [];

  const result: VendorRiskAssessmentDataV1 = {
    kind: 'vendorRiskAssessmentV1',
    vendorName,
    vendorWebsite,
    lastResearchedAt: normalizeIso(parsed.data.last_researched_at ?? null) ?? new Date().toISOString(),
    riskLevel: parsed.data.risk_level ?? null,
    securityAssessment: parsed.data.security_assessment ?? null,
    certifications: certifications.length > 0 ? certifications : null,
    links: normalizedLinks.length > 0 ? normalizedLinks : null,
    news: news.length > 0 ? news : null,
  };

  logger.info('Firecrawl Agent SDK completed vendor research', {
    vendorWebsite,
    found: {
      links: normalizedLinks.length,
      certifications: certifications.length,
      news: news.length,
    },
  });

  return result;
}



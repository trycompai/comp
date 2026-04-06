// apps/api/src/trigger/vendor/vendor-risk-assessment/firecrawl-agent-core.ts
import { logger } from '@trigger.dev/sdk';
import { vendorRiskAssessmentAgentSchema } from './agent-schema';
import type { VendorRiskAssessmentDataV1 } from './agent-types';
import { validateVendorUrl } from './url-validation';
import {
  type FirecrawlSetup,
  handleFirecrawlError,
  normalizeIso,
  setupFirecrawlClient,
} from './firecrawl-agent-shared';

export async function firecrawlResearchCore(params: {
  vendorName: string;
  vendorWebsite: string;
}): Promise<Omit<VendorRiskAssessmentDataV1, 'news'> | null> {
  const setup = setupFirecrawlClient(params);
  if (!setup) return null;

  const { firecrawlClient, vendorDomain, seedUrls } = setup;
  const { vendorName, vendorWebsite } = params;

  const prompt = `Complete cyber security research on the vendor "${vendorName}" with website ${vendorWebsite}.

CRITICAL: Only return URLs that belong to the domain "${vendorDomain}" or its subdomains (e.g., trust.${vendorDomain}, security.${vendorDomain}). Do NOT return URLs from any other domain. If you cannot find a page on ${vendorDomain}, return an empty string for that field rather than a URL from another website.

Extract the following information:
1. **Certifications**: Find any security certifications they have (SOC 2 Type I, SOC 2 Type II, ISO 27001 etc). For each certification found, determine:
   - The type of certification
   - Whether it's verified/current, expired, or not certified
   - Any issue or expiry dates mentioned
   - Link to the compliance/trust page or report if available (must be on ${vendorDomain})

2. **Legal & Security Documents**: Find the direct URLs on ${vendorDomain} to:
   - Privacy Policy page (usually at /privacy, /privacy-policy, or linked in the footer)
   - Terms of Service page (usually at /terms, /tos, /terms-of-service, or linked in the footer)
   - Trust Center or Security page (typically could be at /trust, /security or trust.${vendorDomain} or security.${vendorDomain})

3. **Summary**: Provide an overall assessment of the vendor's security posture.

Focus on their official website ${vendorWebsite} (especially trust/security/compliance pages).`;

  let agentResponse;
  try {
    agentResponse = await firecrawlClient.agent({
      prompt,
      urls: seedUrls,
      strictConstrainToURLs: false,
      maxCredits: 2500,
      timeout: 360,
      pollInterval: 5,
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
        },
        required: ['security_assessment'],
      },
    });
  } catch (error) {
    return handleFirecrawlError(error, { vendorName, vendorWebsite, callType: 'core' });
  }

  if (!agentResponse.success || agentResponse.status === 'failed') {
    logger.warn('Firecrawl core research job did not complete successfully', {
      vendorWebsite,
      status: agentResponse.status,
      error: agentResponse.error,
    });
    return null;
  }

  const parsed = vendorRiskAssessmentAgentSchema.safeParse(agentResponse.data);
  if (!parsed.success) {
    logger.warn('Firecrawl core research returned invalid data shape', {
      vendorWebsite,
      issues: parsed.error.issues,
    });
    return null;
  }

  const links = parsed.data.links ?? null;
  const linkPairs: Array<{ label: string; url: string }> = [];
  if (links?.trust_center_url)
    linkPairs.push({ label: 'Trust & Security', url: links.trust_center_url });
  if (links?.security_page_url)
    linkPairs.push({ label: 'Security Overview', url: links.security_page_url });
  if (links?.soc2_report_url)
    linkPairs.push({ label: 'SOC 2 Report', url: links.soc2_report_url });
  if (links?.privacy_policy_url)
    linkPairs.push({ label: 'Privacy Policy', url: links.privacy_policy_url });
  if (links?.terms_of_service_url)
    linkPairs.push({ label: 'Terms of Service', url: links.terms_of_service_url });

  const normalizedLinks = linkPairs
    .map((l) => ({ ...l, url: validateVendorUrl(l.url, vendorDomain, l.label) }))
    .filter((l): l is { label: string; url: string } => Boolean(l.url));

  const certifications =
    parsed.data.certifications?.map((c) => ({
      type: c.type,
      status: c.status ?? 'unknown',
      issuedAt: normalizeIso(c.issued_at ?? null),
      expiresAt: normalizeIso(c.expires_at ?? null),
      url: validateVendorUrl(c.url ?? null, vendorDomain, `cert:${c.type}`),
    })) ?? [];

  logger.info('Firecrawl core research completed', {
    vendorWebsite,
    found: { links: normalizedLinks.length, certifications: certifications.length },
  });

  return {
    kind: 'vendorRiskAssessmentV1',
    vendorName,
    vendorWebsite,
    lastResearchedAt:
      normalizeIso(parsed.data.last_researched_at ?? null) ?? new Date().toISOString(),
    riskLevel: parsed.data.risk_level ?? null,
    securityAssessment: parsed.data.security_assessment ?? null,
    certifications: certifications.length > 0 ? certifications : null,
    links: normalizedLinks.length > 0 ? normalizedLinks : null,
  };
}

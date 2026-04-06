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

Extract the following information:

1. **Certifications**: Find all security and compliance certifications. For each one found, determine:
   - The type of certification (SOC 2 Type I, SOC 2 Type II, ISO 27001, ISO 27017, ISO 27018, ISO 27701, ISO 42001, FedRAMP, HIPAA, PCI DSS, GDPR, TISAX, CSA STAR, C5, SOC 1, SOC 3, etc.)
   - Whether it's currently active/verified, expired, or not certified
   - Any issue or expiry dates mentioned
   - Direct link to the certification report or trust page

2. **Security & Legal Links**: Find the direct URLs to these pages. IMPORTANT: Many vendors host their trust portal on a third-party platform (e.g., SafeBase at trust.page, Vanta, Drata, Whistic). Prefer the actual trust portal where customers can request security reports over documentation pages that just describe compliance processes.
   - **Trust Center / Security Portal**: The page where customers can review security posture and request compliance reports. This is NOT the docs page about security — it's the dedicated trust portal. Look for links labeled "Trust Center", "Security", "Trust Portal" in the site navigation or footer. It may be hosted on a subdomain (trust.${vendorDomain}, security.${vendorDomain}) or a third-party domain (e.g., ${vendorName.toLowerCase()}.trust.page, ${vendorName.toLowerCase()}.safebase.io). TIP: Try searching "${vendorName} trust portal" or "${vendorName} security trust center" to find it if not immediately visible on the site.
   - **Privacy Policy**: Usually at /privacy or /privacy-policy
   - **Terms of Service**: Usually at /terms or /tos
   - **Security Overview**: A page describing security practices (this CAN be a docs page)
   - **SOC 2 Report**: Direct link to request or download the SOC 2 report

3. **Summary**: Provide an overall assessment of the vendor's security posture based on your findings.

Focus on the official website ${vendorWebsite} and its trust/security/compliance pages.`;

  let agentResponse;
  try {
    agentResponse = await firecrawlClient.agent({
      prompt,
      urls: seedUrls,
      strictConstrainToURLs: false,
      maxCredits: 2500,
      timeout: 360,
      pollInterval: 5,
      ...({ model: 'spark-1-pro' } as Record<string, unknown>), // SDK types lag behind API — model is supported but not typed yet
      schema: {
        type: 'object',
        properties: {
          risk_level: {
            type: 'string',
            description: 'Overall vendor risk level: critical, high, medium, low, or very_low',
          },
          security_assessment: {
            type: 'string',
            description: 'A detailed paragraph summarizing the vendor security posture, including strengths, weaknesses, and key findings',
          },
          last_researched_at: {
            type: 'string',
            description: 'ISO 8601 date of when this research was conducted',
          },
          certifications: {
            type: 'array',
            description: 'All security and compliance certifications found on the vendor website',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Certification name, e.g. SOC 2 Type II, ISO 27001, FedRAMP, HIPAA, PCI DSS, GDPR, ISO 42001, ISO 27017, ISO 27018, TISAX, CSA STAR, C5, etc.',
                },
                status: {
                  type: 'string',
                  enum: ['verified', 'expired', 'not_certified', 'unknown'],
                  description: 'Whether the certification is currently active/verified, expired, not certified, or unknown',
                },
                issued_at: {
                  type: 'string',
                  description: 'ISO 8601 date when the certification was issued, if mentioned',
                },
                expires_at: {
                  type: 'string',
                  description: 'ISO 8601 date when the certification expires, if mentioned',
                },
                url: {
                  type: 'string',
                  description: 'Direct URL to the certification report or trust page on the vendor domain',
                },
              },
              required: ['type'],
            },
          },
          links: {
            type: 'object',
            description: 'Direct URLs to key legal and security pages on the vendor domain',
            properties: {
              privacy_policy_url: {
                type: 'string',
                description: 'Direct URL to the privacy policy page',
              },
              terms_of_service_url: {
                type: 'string',
                description: 'Direct URL to the terms of service page',
              },
              trust_center_url: {
                type: 'string',
                description: 'Direct URL to the trust portal where customers can review security posture and request reports. Prefer the dedicated trust portal (often on trust.page, safebase.io, vanta.com, or a trust. subdomain) over documentation pages.',
              },
              security_page_url: {
                type: 'string',
                description: 'Direct URL to the security overview or security practices page',
              },
              soc2_report_url: {
                type: 'string',
                description: 'Direct URL to request or download the SOC 2 report',
              },
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

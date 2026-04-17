// apps/api/src/trigger/vendor/vendor-risk-assessment/firecrawl-agent-core.ts
import { logger } from '@trigger.dev/sdk';
import { vendorRiskAssessmentAgentSchema } from './agent-schema';
import type {
  VendorRiskAssessmentCertification,
  VendorRiskAssessmentDataV1,
} from './agent-types';
import { validateVendorUrl } from './url-validation';
import {
  type FirecrawlSetup,
  handleFirecrawlError,
  normalizeIso,
  setupFirecrawlClient,
} from './firecrawl-agent-shared';
import { deepScrapeTrustPortal } from './trust-portal-deep-scrape';
import { mergeCertifications } from './trust-portal-deep-scrape-merge';
import { pickDeepScrapeSourceUrl } from './deep-scrape-source-url';
import { firecrawlAgentJsonSchema } from './firecrawl-agent-schema-json';
import { buildFirecrawlAgentPrompt } from './firecrawl-agent-prompt';
import {
  asRecord,
  countPopulatedAgentFields,
  extractAgentPayloadCandidates,
} from './firecrawl-agent-payload';

export async function firecrawlResearchCore(params: {
  vendorName: string;
  vendorWebsite: string;
}): Promise<Omit<VendorRiskAssessmentDataV1, 'news'> | null> {
  const setup = setupFirecrawlClient(params);
  if (!setup) return null;

  const { firecrawlClient, vendorDomain, seedUrls } = setup;
  const { vendorName, vendorWebsite } = params;

  const prompt = buildFirecrawlAgentPrompt({
    vendorName,
    vendorWebsite,
    vendorDomain,
  });

  const runCoreAgent = async (urls: string[]) =>
    firecrawlClient.agent({
      prompt,
      urls,
      strictConstrainToURLs: false,
      maxCredits: 4000,
      // SDK polls this long before returning whatever status it has. 360s
      // wasn't enough for slow SPA trust centers (Ubiquiti) — SDK returned
      // "processing" and we silently parsed empty data. 25 min gives the
      // agent plenty of room; the new status check also ensures we surface
      // timeouts instead of pretending success.
      timeout: 1500,
      pollInterval: 5,
      ...({ model: 'spark-1-pro' } as Record<string, unknown>), // SDK types lag behind API — model is supported but not typed yet
      schema: firecrawlAgentJsonSchema,
    });

  let agentResponse;
  try {
    agentResponse = await runCoreAgent(seedUrls);
  } catch (error) {
    return handleFirecrawlError(error, {
      vendorName,
      vendorWebsite,
      callType: 'core',
    });
  }

  const responseErrorMessage =
    typeof agentResponse.error === 'string'
      ? agentResponse.error
      : String(agentResponse.error ?? '');
  const shouldRetryFetchFailed =
    agentResponse.status === 'failed' &&
    /fetch failed/i.test(responseErrorMessage);

  if (shouldRetryFetchFailed) {
    const retryUrls = Array.from(
      new Set([
        ...seedUrls,
        `https://${vendorDomain}`,
        `https://${vendorDomain}/trust-center`,
        `https://${vendorDomain}/trust-center#cloud-security`,
        `https://www.${vendorDomain}`,
        `https://www.${vendorDomain}/trust-center`,
        `https://www.${vendorDomain}/trust-center#cloud-security`,
      ]),
    );

    logger.warn('Firecrawl core research fetch failed; retrying once', {
      vendorWebsite,
      originalStatus: agentResponse.status,
      originalError: responseErrorMessage,
      retryUrlCount: retryUrls.length,
    });

    try {
      agentResponse = await runCoreAgent(retryUrls);
    } catch (error) {
      return handleFirecrawlError(error, {
        vendorName,
        vendorWebsite,
        callType: 'core_retry',
      });
    }
  }

  if (!agentResponse.success || agentResponse.status !== 'completed') {
    const isProcessing = agentResponse.status === 'processing';
    logger.warn('Firecrawl core research job did not complete successfully', {
      vendorWebsite,
      status: agentResponse.status,
      success: agentResponse.success,
      error: agentResponse.error,
      // Full raw response only on the exceptional path — on happy path
      // the parsed data is already surfaced by the snapshot log below.
      agentResponseJson: JSON.stringify(agentResponse).slice(0, 4000),
      note: isProcessing
        ? 'SDK returned while the agent job is still running on Firecrawl. Bump timeout, or poll with getAgentStatus.'
        : undefined,
    });
    return null;
  }

  const payloadCandidates = extractAgentPayloadCandidates(agentResponse);
  const parseAttempts = payloadCandidates.map((candidate) => ({
    candidate,
    result: vendorRiskAssessmentAgentSchema.safeParse(candidate),
  }));
  // Pick the candidate that parsed successfully AND populated the most
  // fields. Every schema field is optional, so the outer wrapper parses
  // as {} and would otherwise win over the nested `.data` payload — which
  // is exactly what was dropping real agent output on the floor.
  const successfulAttempts = parseAttempts.filter((a) => a.result.success);
  const parsedAttempt = successfulAttempts.reduce<
    (typeof successfulAttempts)[number] | null
  >((best, curr) => {
    if (!curr.result.success) return best;
    if (!best || !best.result.success) return curr;
    return countPopulatedAgentFields(curr.result.data) >
      countPopulatedAgentFields(best.result.data)
      ? curr
      : best;
  }, null);

  if (!parsedAttempt || !parsedAttempt.result.success) {
    const responseRecord = asRecord(agentResponse);
    const firstAttempt = parseAttempts[0]?.result;
    const primaryIssues =
      firstAttempt && !firstAttempt.success ? firstAttempt.error.issues : [];

    logger.warn('Firecrawl core research returned invalid data shape', {
      vendorWebsite,
      issues: primaryIssues,
      payloadCandidateCount: payloadCandidates.length,
      responseKeys: responseRecord ? Object.keys(responseRecord) : [],
    });
    return null;
  }
  const parsed = parsedAttempt.result;

  const links = parsed.data.links ?? null;
  const linkPairs: Array<{ label: string; url: string }> = [];
  if (links?.trust_center_url)
    linkPairs.push({ label: 'Trust & Security', url: links.trust_center_url });
  if (links?.security_page_url)
    linkPairs.push({
      label: 'Security Overview',
      url: links.security_page_url,
    });
  if (links?.soc2_report_url)
    linkPairs.push({ label: 'SOC 2 Report', url: links.soc2_report_url });
  if (links?.privacy_policy_url)
    linkPairs.push({ label: 'Privacy Policy', url: links.privacy_policy_url });
  if (links?.terms_of_service_url)
    linkPairs.push({
      label: 'Terms of Service',
      url: links.terms_of_service_url,
    });

  const normalizedLinks = linkPairs
    .map((l) => ({
      ...l,
      url: validateVendorUrl(l.url, vendorDomain, l.label),
    }))
    .filter((l): l is { label: string; url: string } => Boolean(l.url));

  const certifications =
    parsed.data.certifications?.map((c) => ({
      type: c.type,
      status: c.status ?? 'unknown',
      issuedAt: normalizeIso(c.issued_at ?? null),
      expiresAt: normalizeIso(c.expires_at ?? null),
      url: validateVendorUrl(c.url ?? null, vendorDomain, `cert:${c.type}`),
    })) ?? [];

  logger.info('Firecrawl Agent returned — pre-deep-scrape snapshot', {
    vendorWebsite,
    normalizedLinksJson: JSON.stringify(normalizedLinks),
    agentCertificationsJson: JSON.stringify(
      certifications.map((c) => ({
        type: c.type,
        status: c.status,
      })),
    ),
    verifiedAgentCertCount: certifications.filter(
      (c) => c.status === 'verified',
    ).length,
    agentRiskLevel: parsed.data.risk_level ?? null,
  });

  const deepScrapeSourceUrl = pickDeepScrapeSourceUrl({
    vendorDomain,
    links: normalizedLinks,
    certifications,
  });

  let mergedCertifications: VendorRiskAssessmentCertification[] =
    certifications;
  if (deepScrapeSourceUrl) {
    logger.info('Trust portal deep-scrape: source URL resolved', {
      vendorWebsite,
      vendorDomain,
      sourceUrl: deepScrapeSourceUrl,
    });
    const deepCerts = await deepScrapeTrustPortal({
      vendorName,
      vendorDomain,
      sourceUrl: deepScrapeSourceUrl,
      firecrawlClient,
    });
    if (deepCerts && deepCerts.length > 0) {
      mergedCertifications = mergeCertifications(certifications, deepCerts);
      logger.info('Trust portal deep-scrape merged into core certifications', {
        vendorWebsite,
        coreCount: certifications.length,
        deepCount: deepCerts.length,
        mergedCount: mergedCertifications.length,
        mergedTypesJson: JSON.stringify(
          mergedCertifications.map((c) => ({
            type: c.type,
            status: c.status,
          })),
        ),
      });
    } else {
      logger.info(
        'Trust portal deep-scrape returned no certifications — keeping Agent result',
        {
          vendorWebsite,
          deepReturnedNull: deepCerts === null,
          deepReturnedEmpty: Array.isArray(deepCerts) && deepCerts.length === 0,
        },
      );
    }
  } else {
    logger.info(
      'Trust portal deep-scrape skipped: pickDeepScrapeSourceUrl found no usable URL on vendor domain',
      {
        vendorWebsite,
        vendorDomain,
        availableLinksJson: JSON.stringify(
          normalizedLinks.map((l) => ({ label: l.label, url: l.url })),
        ),
        verifiedCertsWithUrlsJson: JSON.stringify(
          certifications
            .filter((c) => c.status === 'verified' && c.url)
            .map((c) => ({ type: c.type, url: c.url })),
        ),
      },
    );
  }

  logger.info('Firecrawl core research completed', {
    vendorWebsite,
    found: {
      links: normalizedLinks.length,
      certifications: mergedCertifications.length,
    },
  });

  return {
    kind: 'vendorRiskAssessmentV1',
    vendorName,
    vendorWebsite,
    lastResearchedAt:
      normalizeIso(parsed.data.last_researched_at ?? null) ??
      new Date().toISOString(),
    riskLevel: parsed.data.risk_level ?? null,
    securityAssessment: parsed.data.security_assessment ?? null,
    certifications:
      mergedCertifications.length > 0 ? mergedCertifications : null,
    links: normalizedLinks.length > 0 ? normalizedLinks : null,
  };
}

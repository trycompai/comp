import Firecrawl from '@mendable/firecrawl-js';
import { logger } from '@trigger.dev/sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import type {
  VendorRiskAssessmentCertification,
  VendorRiskAssessmentCertificationStatus,
} from './agent-types';
import { isKnownThirdPartyPortalHost } from './url-validation';
import {
  discoverSectionUrls,
  MAX_SECTION_URLS,
  type DeepScrapeSection,
} from './trust-portal-deep-scrape-sections';
import { identifySidebarTabs } from './trust-portal-deep-scrape-tabs';
import {
  buildInitialScrapeOptions,
  buildSectionScrapeOptions,
} from './trust-portal-deep-scrape-scrape-options';

const EXTRACTION_MODEL = 'claude-sonnet-4-6';
const SECTION_CONCURRENCY = 5;
const MARKDOWN_TRUNCATE_LIMIT = 200_000;

const certificationExtractionSchema = z.object({
  certifications: z.array(z.object({
    type: z.string().describe(
      'Canonical certification name, e.g. "SOC 2 Type II", "ISO 27001", "PCI DSS", "ISO 27017", "FedRAMP", "HIPAA", "GDPR", "ISO 42001"',
    ),
    status: z.enum(['verified', 'expired', 'not_certified', 'unknown']).describe(
      'verified when the page lists this framework as current; expired only if explicitly said so; not_certified only if the page explicitly says so; unknown otherwise',
    ),
    issued_at: z.string().optional().nullable(),
    expires_at: z.string().optional().nullable(),
    evidence_snippet: z.string().describe(
      'Short quote from the markdown (< 200 chars) that supports this certification. Must be present in the markdown verbatim.',
    ),
  })).default([]),
});

type ScrapeResponse = { markdown?: string; links?: string[] };

function truncateMarkdown(input: string): string {
  if (input.length <= MARKDOWN_TRUNCATE_LIMIT) return input;
  logger.warn('Trust portal combined markdown truncated for extraction', {
    originalLength: input.length,
    limit: MARKDOWN_TRUNCATE_LIMIT,
  });
  return input.slice(0, MARKDOWN_TRUNCATE_LIMIT);
}

function buildExtractionPrompt(args: {
  vendorName: string;
  combinedMarkdown: string;
}): string {
  return `You are extracting security and compliance certifications from a vendor's trust center page.

Vendor: ${args.vendorName}

Rules:
- Only return certifications that are explicitly listed in the markdown below.
- Never invent certifications. If a certification is not mentioned, do not include it.
- Mark status as "verified" when the page lists it as a current/active framework (including badge callouts and "we are certified" language).
- Mark status as "expired" only when the page explicitly says the certification has lapsed.
- Mark status as "not_certified" only when the page explicitly says the vendor is not certified.
- Otherwise use "unknown".
- Normalize the type name to canonical form (e.g. "Soc 2 Type II" → "SOC 2 Type II", "ISO/IEC 27001:2013" → "ISO 27001", "PCI-DSS" → "PCI DSS").
- Always include evidence_snippet with a verbatim quote from the markdown. Certifications without an evidence_snippet will be discarded.

Markdown from the trust portal and its sections:

${args.combinedMarkdown}`;
}


async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

export type DeepScrapeParams = {
  vendorName: string;
  vendorDomain: string;
  sourceUrl: string | null;
  firecrawlClient: Firecrawl;
};

export async function deepScrapeTrustPortal(
  params: DeepScrapeParams,
): Promise<VendorRiskAssessmentCertification[] | null> {
  const { vendorName, vendorDomain, sourceUrl, firecrawlClient } = params;

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

  logger.info('Trust portal deep-scrape starting', {
    vendorName,
    sourceUrl,
  });
  // 1. Initial scrape
  let initial: ScrapeResponse;
  try {
    initial = (await firecrawlClient.scrape(
      sourceUrl,
      buildInitialScrapeOptions() as unknown as Record<string, unknown>,
    )) as ScrapeResponse;
  } catch (error) {
    logger.warn('Trust portal deep-scrape: initial scrape failed', {
      vendorName,
      sourceUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const initialMarkdown = initial.markdown ?? '';
  const links = Array.isArray(initial.links) ? initial.links : [];
  logger.info('Trust portal deep-scrape: initial scrape returned', {
    vendorName,
    sourceUrl,
    markdownLength: initialMarkdown.length,
    linkCount: links.length,
  });
  // 2. Discover sections
  const urlSections = discoverSectionUrls({ sourceUrl, links });

  // 2a. If URL-based discovery found nothing (SPA sidebar with no hrefs),
  // ask an LLM to identify tab labels from the initial markdown and
  // synthesize click-by-text sections.
  const tabSections: DeepScrapeSection[] =
    urlSections.length === 0 && initialMarkdown.trim().length > 0
      ? (await identifySidebarTabs({ vendorName, initialMarkdown })).map(
          (tabLabel) => ({
            url: sourceUrl,
            anchor: null,
            label: tabLabel,
            tabLabel,
          }),
        )
      : [];

  const seenLabels = new Set<string>();
  const sections: DeepScrapeSection[] = [];
  for (const s of [...urlSections, ...tabSections]) {
    const key = s.label.trim().toLowerCase();
    if (!key || seenLabels.has(key)) continue;
    seenLabels.add(key);
    sections.push(s);
    if (sections.length >= MAX_SECTION_URLS) break;
  }

  logger.info('Trust portal deep-scrape: sections discovered', {
    vendorName,
    sectionCount: sections.length,
    urlSectionCount: urlSections.length,
    tabSectionCount: tabSections.length,
    sections: sections.map((s) => s.label),
  });
  // 3. Per-section scrapes (bounded concurrency)
  const sectionResults = await mapWithConcurrency(
    sections,
    SECTION_CONCURRENCY,
    async (section) => {
      const response = (await firecrawlClient.scrape(
        section.url,
        buildSectionScrapeOptions(section) as unknown as Record<
          string,
          unknown
        >,
      )) as ScrapeResponse;
      return { section, markdown: response.markdown ?? '' };
    },
  );

  const sectionChunks: string[] = [];
  for (const [index, result] of sectionResults.entries()) {
    if (result.status === 'fulfilled') {
      const { section, markdown } = result.value;
      if (markdown.trim().length > 0) {
        sectionChunks.push(
          `\n\n---\n# Section: ${section.label}\n\n${markdown}`,
        );
      }
    } else {
      logger.warn('Trust portal deep-scrape: section scrape failed', {
        vendorName,
        section: sections[index].label,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    }
  }

  const combinedMarkdown = truncateMarkdown(
    [initialMarkdown, ...sectionChunks].join(''),
  );

  if (combinedMarkdown.trim().length === 0) {
    logger.warn(
      'Trust portal deep-scrape: combined markdown is empty, skipping extraction',
      { vendorName, sourceUrl },
    );
    return null;
  }
  // 4. AI extraction
  type ExtractedCert = {
    type: string; status: VendorRiskAssessmentCertificationStatus;
    issued_at?: string | null; expires_at?: string | null; evidence_snippet: string;
  };
  let extracted: { certifications: ExtractedCert[] };
  try {
    const { object } = await generateObject({
      model: anthropic(EXTRACTION_MODEL),
      schema: certificationExtractionSchema,
      prompt: buildExtractionPrompt({ vendorName, combinedMarkdown }),
    });
    extracted = object;
  } catch (error) {
    logger.warn('Trust portal deep-scrape: AI extraction failed', {
      vendorName,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const certifications: VendorRiskAssessmentCertification[] =
    extracted.certifications
      .filter(
        (c) => c.evidence_snippet && c.evidence_snippet.trim().length > 0,
      )
      .map((c) => ({
        type: c.type,
        status: c.status,
        issuedAt: c.issued_at ?? null,
        expiresAt: c.expires_at ?? null,
        url: null,
      }));

  logger.info('Trust portal deep-scrape: completed', {
    vendorName,
    certificationCount: certifications.length,
    sectionCount: sections.length,
    initialMarkdownLength: initialMarkdown.length,
    combinedMarkdownLength: combinedMarkdown.length,
  });

  return certifications.length > 0 ? certifications : null;
}

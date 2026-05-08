import { logger } from '@trigger.dev/sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * Some trust portals are SPAs whose sidebar items are buttons/divs without
 * href attributes — Firecrawl's `links` format doesn't enumerate them.
 * When URL-based section discovery yields nothing, ask Claude Sonnet 4.6
 * to extract sidebar/tab labels from the initial markdown so the orchestrator
 * can click each by text content.
 */

const TAB_MODEL = 'claude-sonnet-4-6';
const MAX_TABS = 15;
const MARKDOWN_LIMIT = 12_000;

const tabSchema = z.object({
  tabLabels: z
    .array(z.string())
    .describe(
      'Sidebar/tab labels present on the trust portal landing page. Each label is a short phrase (1-4 words) that, when clicked, reveals additional security/compliance content. Return an empty array if no such items exist.',
    )
    .default([]),
});

function buildPrompt(args: {
  vendorName: string;
  initialMarkdown: string;
}): string {
  return `You are analyzing the markdown of a vendor's trust portal landing page.

Some trust portals are single-page apps where sidebar/tab items don't have real href URLs — they're buttons that reveal additional security/compliance content when clicked. Your job is to identify those sidebar/tab labels so a downstream scraper can programmatically click each one.

Vendor: ${args.vendorName}

Include labels that:
- Look like sidebar/tab nav items (typically 1-4 words, e.g. "Cloud Security", "NDAA Compliance", "Corporate Security", "Certifications", "Reports", "Data Centers", "Subprocessors", "Bug Bounty Program", "Advisory Bulletins", "Overview", "Policies").
- Sit inside or near the trust/security content region of the page.

Exclude:
- Site-wide navigation labels ("Home", "Products", "Store", "Support", "Contact Us", "Careers", "Blog", "Training", "Investor Relations", "What's New").
- Footer / legal items ("Privacy Policy", "Terms of Service", "Legal").
- Product category labels ("Cloud Gateways", "Switching", "WiFi", "Camera Security", "Door Access", "Integrations").

Return at most ${MAX_TABS} labels. Return an empty array if you see no sidebar/tab items.

Markdown:

${args.initialMarkdown.slice(0, MARKDOWN_LIMIT)}`;
}

export async function identifySidebarTabs(params: {
  vendorName: string;
  initialMarkdown: string;
}): Promise<string[]> {
  const { vendorName, initialMarkdown } = params;

  if (!initialMarkdown || initialMarkdown.trim().length === 0) {
    return [];
  }

  try {
    const { object } = await generateObject({
      model: anthropic(TAB_MODEL),
      schema: tabSchema,
      prompt: buildPrompt({ vendorName, initialMarkdown }),
    });

    const deduped = Array.from(
      new Set(
        (object.tabLabels ?? [])
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && l.length <= 60),
      ),
    ).slice(0, MAX_TABS);

    logger.info('Trust portal deep-scrape: tab labels identified', {
      vendorName,
      count: deduped.length,
      tabLabelsJson: JSON.stringify(deduped),
    });

    return deduped;
  } catch (error) {
    logger.warn('Trust portal deep-scrape: tab identification failed', {
      vendorName,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

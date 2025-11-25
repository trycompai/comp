import { getOrganizationContext } from '@/jobs/tasks/onboarding/onboard-organization-helpers';
import { openai } from '@ai-sdk/openai';
import { logger, metadata, schemaTask } from '@trigger.dev/sdk';
import { generateText } from 'ai';
import { z } from 'zod';

const SECTIONS = [
  'company-background',
  'services',
  'mission-vision',
  'system-description',
  'critical-vendors',
  'subservice-organizations',
] as const;

type Section = (typeof SECTIONS)[number];

// Shared formatting rules for company overview sections
const COMPANY_SECTION_FORMAT = `
FORMATTING & TONE RULES:
- Keep the heading exactly as written.
- One concise paragraph per heading (approximately 80-120 words).
- Integrate concrete facts from the site—founding year, HQ, product highlights, key metrics—without marketing hype.
- Do NOT include tables, bullet lists, citations, or any extra sections.
- Do NOT repeat the URL or add external links.

TONE GUARDRAILS:
- Write in a direct, declarative voice. State facts without attribution.
- Do NOT use evidentials or meta phrases: "the website says/notes/states," "according to," "they claim," "it appears," "seems," "we found," "our research."
- Do NOT hedge: avoid "may," "might," "likely," "appears."
- Use simple present tense and third person.
- Treat the company site as the authoritative source. If a detail isn't verifiable on the site, OMIT it rather than hedging.
- No marketing language or value judgments.

EXAMPLES:
- Instead of: "The site notes operations are in Finland." Write: "Operations are rooted in Finland."
- Instead of: "According to the website, the mission is to…" Write: "The mission is to…"
- Instead of: "Documentation states, an emphasis on..." Write: "There is an emphasis on..."
`;

const sectionPrompts: Record<Section, string> = {
  'company-background': `Write a section titled "Company Background & Overview of Operations".

Summarize the company background and overview of operations including: founding year, headquarters location, industry, business model, and operational overview.

${COMPANY_SECTION_FORMAT}`,
  services: `Write a section titled "Types of Services Provided".

Describe the types of services and/or products the company provides, including key offerings and target markets.

${COMPANY_SECTION_FORMAT}`,
  'mission-vision': `Write a section titled "Mission & Vision".

State the company's mission and vision. If explicit mission or vision statements exist, use them. If not, summarize the company's stated purpose and goals.

${COMPANY_SECTION_FORMAT}`,
  'system-description':
    "Extract information about the company's systems, technology stack, and technical infrastructure. Only include technologies and systems that are explicitly mentioned in the provided sources.",
  'critical-vendors':
    'Extract any mentions of critical vendors, third-party service providers, or technology partners. Only include vendors that are explicitly named in the provided sources.',
  'subservice-organizations':
    'Extract any mentions of subservice organizations, subsidiaries, or related entities. Only include organizations that are explicitly named in the provided sources.',
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_POLL_DURATION_MS = 1000 * 60 * 5; // 5 minutes
const POLL_INTERVAL_MS = 5000; // 5 seconds

async function scrapeWebsite(website: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error('Firecrawl API key is not configured');
  }

  const initialResponse = await fetch('https://api.firecrawl.dev/v1/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      urls: [website],
      prompt:
        'Extract all text content from this website, including company information, services, mission, vision, and any other relevant business information.',
      scrapeOptions: {
        onlyMainContent: true,
        removeBase64Images: true,
      },
    }),
  });

  const initialData = await initialResponse.json();

  if (!initialData.success || !initialData.id) {
    throw new Error('Failed to start Firecrawl extraction');
  }

  const jobId = initialData.id;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    await sleep(POLL_INTERVAL_MS);

    const statusResponse = await fetch(`https://api.firecrawl.dev/v1/extract/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const statusData = await statusResponse.json();

    if (statusData.status === 'completed' && statusData.data) {
      const extractedData = statusData.data;
      if (typeof extractedData === 'string') {
        return extractedData;
      }
      if (typeof extractedData === 'object' && extractedData.content) {
        return typeof extractedData.content === 'string'
          ? extractedData.content
          : JSON.stringify(extractedData.content);
      }
      return JSON.stringify(extractedData);
    }

    if (statusData.status === 'failed') {
      throw new Error('Firecrawl extraction failed');
    }

    if (statusData.status === 'cancelled') {
      throw new Error('Firecrawl extraction was cancelled');
    }
  }

  throw new Error('Firecrawl extraction timed out');
}

async function generateSectionContent(
  section: Section,
  organization: { name: string; website: string },
  websiteContent: string,
  contextHubText: string,
): Promise<string> {
  const { text } = await generateText({
    model: openai('gpt-4.1'),
    system: `You are an expert at extracting and organizing company information for audit purposes.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY use information that is EXPLICITLY stated in the provided Website Content or Organization Context.
2. DO NOT make up, infer, assume, or hallucinate ANY information.
3. DO NOT add generic industry information or common practices that are not explicitly mentioned.
4. If information for a section is not available in the provided sources, clearly state: "This information was not found in the available sources."
5. Use direct quotes or close paraphrasing from the source material when possible.
6. Write in first-person plural (we, our, us) when describing the company.
7. Be concise and factual. Quality over quantity.

If you cannot find relevant information in the provided sources, DO NOT fill in the gaps with assumptions. Simply state what information is missing.`,
    prompt: `${sectionPrompts[section]}

Organization Name: ${organization.name}
Website: ${organization.website}

=== WEBSITE CONTENT (Source 1) ===
${websiteContent}

=== ORGANIZATION CONTEXT (Source 2) ===
${contextHubText || 'No additional context available.'}

=== END OF SOURCES ===

Based ONLY on the information found in the sources above, generate the requested content. Do not include any information that is not explicitly present in these sources:`,
  });

  return text;
}

export const generateAuditorContentTask = schemaTask({
  id: 'generate-auditor-content',
  schema: z.object({
    organizationId: z.string(),
  }),
  maxDuration: 1000 * 60 * 15, // 15 minutes
  retry: {
    maxAttempts: 3,
  },
  run: async (payload) => {
    const { organizationId } = payload;

    logger.info(`Starting auditor content generation for org ${organizationId}`);

    // Initialize metadata for tracking
    metadata.set('status', 'initializing');
    metadata.set('currentSection', null);
    metadata.set('completedSections', 0);
    metadata.set('totalSections', SECTIONS.length);

    // Initialize all sections as pending
    const results: Record<Section, string | null> = {
      'company-background': null,
      services: null,
      'mission-vision': null,
      'system-description': null,
      'critical-vendors': null,
      'subservice-organizations': null,
    };

    for (const section of SECTIONS) {
      metadata.set(`section_${section}_status`, 'pending');
      metadata.set(`section_${section}_content`, null);
    }

    try {
      // Get organization context
      metadata.set('status', 'fetching-context');
      const { organization, questionsAndAnswers } = await getOrganizationContext(organizationId);

      if (!organization.website) {
        metadata.set('status', 'error');
        metadata.set('error', 'Organization website is not set');
        return {
          success: false,
          error: 'Organization website is not set',
          results: null,
        };
      }

      // Scrape website
      metadata.set('status', 'scraping-website');
      logger.info(`Scraping website: ${organization.website}`);

      let websiteContent: string;
      try {
        websiteContent = await scrapeWebsite(organization.website);
      } catch (error) {
        metadata.set('status', 'error');
        metadata.set('error', 'Failed to scrape website');
        logger.error('Failed to scrape website', { error });
        return {
          success: false,
          error: 'Failed to scrape website',
          results: null,
        };
      }

      // Build context from organization data
      const contextHubText = questionsAndAnswers
        .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join('\n\n');

      metadata.set('status', 'generating');

      // Generate content for each section
      for (const section of SECTIONS) {
        logger.info(`Generating content for section: ${section}`);
        metadata.set('currentSection', section);
        metadata.set(`section_${section}_status`, 'generating');

        try {
          const content = await generateSectionContent(
            section,
            { name: organization.name, website: organization.website },
            websiteContent,
            contextHubText,
          );

          results[section] = content;
          metadata.set(`section_${section}_status`, 'completed');
          metadata.set(`section_${section}_content`, content);
          metadata.increment('completedSections', 1);

          logger.info(`Completed section: ${section}`);
        } catch (error) {
          logger.error(`Failed to generate content for section: ${section}`, { error });
          metadata.set(`section_${section}_status`, 'error');
          metadata.set(
            `section_${section}_error`,
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }

      metadata.set('status', 'completed');
      metadata.set('currentSection', null);

      logger.info(`Completed auditor content generation for org ${organizationId}`);

      return {
        success: true,
        results,
      };
    } catch (error) {
      logger.error('Failed to generate auditor content', { error });
      metadata.set('status', 'error');
      metadata.set('error', error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate content',
        results: null,
      };
    }
  },
});

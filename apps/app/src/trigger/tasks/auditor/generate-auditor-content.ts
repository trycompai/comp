import { getOrganizationContext } from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { openai } from '@ai-sdk/openai';
import { db } from '@db/server';
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

// Map from section keys to Context question strings
const SECTION_QUESTIONS: Record<Section, string> = {
  'company-background': 'Company Background & Overview of Operations',
  services: 'Types of Services Provided',
  'mission-vision': 'Mission & Vision',
  'system-description': 'System Description',
  'critical-vendors': 'Critical Vendors',
  'subservice-organizations': 'Subservice Organizations',
};

// Shared tone rules
const TONE_RULES = `
TONE:
- Direct, declarative voice. State facts without attribution.
- No hedging ("may", "might", "likely", "appears").
- No meta phrases ("the website says", "according to", "it appears").
- Third person, simple present tense.
- NEVER mention missing information - only write about what IS available.
`;

const sectionPrompts: Record<Section, string> = {
  'company-background': `Write ONE paragraph (~80 words) describing the company background and operations.

INCLUDE (where available): company name, what they do, headquarters location, certifications, workforce characteristics, strategic positioning, operational scope.

EXAMPLE:
"[Company] is a [type of business] headquartered in [location], with operations serving [markets/regions]. It holds [certifications] and describes itself as [self-description]. It supports [workforce details] and [strategic advantages]. Its services are structured to [delivery approach]."

RULES:
- Do NOT include the section title.
- ONE paragraph only, ~80 words.
- No bullet points.
${TONE_RULES}`,

  services: `Write ONE paragraph (~60 words) describing the services/products provided.

INCLUDE (where available): service categories, specific service types, technology approach, target markets, business model aspects.

EXAMPLE:
"The company provides [service categories] including [specific services]. It also emphasises [technology/methodology approach]. Its service model includes [business model details]."

RULES:
- Do NOT include the section title.
- ONE paragraph only, ~60 words.
- No bullet points.
${TONE_RULES}`,

  'mission-vision': `Write ONE paragraph (~60 words) describing mission and vision.

USE THIS STRUCTURE:
"[Company] positions its mission around [mission focus], with an emphasis on [key values]. It envisions [vision/strategy for the future]."

RULES:
- Do NOT include the section title.
- ONE paragraph only, ~60 words.
- Use "positions its mission around" and "envisions" phrasing.
- No bullet points.
${TONE_RULES}`,

  'system-description': `Write ONE paragraph (~80 words) describing the technical infrastructure.

USE THIS STRUCTURE:
"[Company] operates a [type of architecture] where [what flows] from [sources] through [network components], via [security/routing], to [destinations/segments]. External connectivity includes [integrations/platforms], and hosting includes [cloud/on-prem infrastructure]."

Use parentheticals for specifics: "(including X, Y, Z)".

RULES:
- Do NOT include the section title.
- ONE paragraph only, ~80 words.
- Describe the FLOW of data/operations through infrastructure.
- No bullet points.
${TONE_RULES}`,

  'critical-vendors': `Using the provided vendor/software list, narrow it down to ONLY the critical vendors from a SOC 2 perspective for the audit report.

A critical vendor is one that:
- Hosts or processes customer data (cloud infrastructure providers like AWS, GCP, Azure)
- Provides core identity / authentication services (e.g. Okta, Google Workspace, Microsoft 365 — but ONLY if used as the primary identity provider)
- Is essential to the company's production system or service delivery
- Handles sensitive data (e.g. payment processors IF the company processes payments as a core service)

DO NOT INCLUDE vendors that are:
- Internal productivity / collaboration tools (e.g. Notion, Slack, Teams, Jira, Confluence, Asana)
- General business tools (e.g. Stripe, HubSpot, Intercom, Zendesk)
- HR / payroll tools (e.g. Rippling, Gusto, BambooHR)
- Marketing or analytics tools
- Version control or CI/CD tools (e.g. GitHub, GitLab) unless they host production infrastructure
- Security monitoring tools (e.g. Vanta, Drata, CrowdStrike)

Typically a SOC 2 report includes only 3-6 critical vendors. Be very selective.

FORMAT — one vendor per line:
[Vendor Name] – [Type: SaaS/IaaS/PaaS] – ([Brief description of service])

EXAMPLE:
AWS – IaaS / PaaS – (Cloud infrastructure and hosting)
Google Workspace – SaaS – (Primary identity provider and email)
Datadog – SaaS – (Production monitoring and observability)

RULES:
- Do NOT include the section title.
- Each vendor on its own line.
- Follow the exact format: Name – Type – (Description)
- Only include vendors from the provided sources — do not add vendors not mentioned.
- Aim for 3-6 vendors maximum.
${TONE_RULES}`,

  'subservice-organizations': `Identify the subservice organisations from a SOC 2 perspective.

A subservice organisation is an external service provider whose infrastructure or platform the company DIRECTLY RELIES ON to deliver its own services to customers. In SOC 2 terms, these are typically the main cloud infrastructure / hosting providers (IaaS/PaaS) — e.g. AWS, Google Cloud Platform, Microsoft Azure.

DO NOT INCLUDE:
- SaaS tools the company merely uses internally (e.g. Slack, Notion, Jira, GitHub, Stripe, HubSpot)
- Communication or collaboration platforms (e.g. Teams, Zoom)
- HR, payroll, or admin tools
- Security or monitoring tools
- Any tool that is NOT the primary infrastructure hosting the company's production system

Typically there is only 1 (sometimes 2) subservice organisations. Be very selective.

FORMAT:
Subservice organisations: [Name1], [Name2], ...

If only one: "Subservice organisations: [Name]"

EXAMPLE:
Subservice organisations: AWS

RULES:
- Do NOT include the section title.
- Use "Subservice organisations:" prefix.
- Just list the names, comma-separated if multiple.
- Look for where the company hosts its applications and data — that is the subservice organisation.
${TONE_RULES}`,
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_POLL_DURATION_MS = 1000 * 60 * 30; // 30 minutes
const POLL_INTERVAL_MS = 5000; // 5 seconds

async function scrapeWebsite(website: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error('Firecrawl API key is not configured');
  }

  // Start extraction job using v2 API
  const initialResponse = await fetch('https://api.firecrawl.dev/v2/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      urls: [website],
      prompt:
        'Extract all text content from this website, including company information, services, mission, vision, and any other relevant business information. Return the content as plain text or markdown.',
      limit: 10,
    }),
  });

  const initialData = await initialResponse.json();

  if (!initialData.success) {
    logger.error('Failed to start Firecrawl extraction', { initialData });
    throw new Error('Failed to start Firecrawl extraction');
  }

  if (!initialData.id) {
    logger.error('Firecrawl did not return job ID', { initialData });
    throw new Error('Firecrawl did not return job ID');
  }

  const jobId = initialData.id;
  const startTime = Date.now();
  logger.info('Firecrawl extraction started, polling for completion', { jobId });

  // Poll for completion
  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    await sleep(POLL_INTERVAL_MS);

    const statusResponse = await fetch(`https://api.firecrawl.dev/v2/extract/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const statusData = await statusResponse.json();

    logger.info('Firecrawl status check', {
      status: statusData.status,
      jobId,
      hasData: !!statusData.data,
    });

    if (statusData.status === 'completed') {
      if (!statusData.data) {
        logger.error('Firecrawl completed but no data returned', { statusData, jobId });
        throw new Error('Firecrawl extraction completed but returned no data');
      }

      // v2 API returns data as an object, convert to string for processing
      const extractedData = statusData.data;
      if (typeof extractedData === 'string') {
        return extractedData;
      }
      // Convert structured data to readable text format
      return JSON.stringify(extractedData, null, 2);
    }

    if (statusData.status === 'failed') {
      logger.error('Firecrawl extraction failed', { statusData, jobId });
      throw new Error('Firecrawl extraction failed');
    }

    if (statusData.status === 'cancelled') {
      logger.error('Firecrawl extraction was cancelled', { statusData, jobId });
      throw new Error('Firecrawl extraction was cancelled');
    }

    // Status is still 'processing', continue polling
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
    model: openai('gpt-5.2'),
    system: `You are an expert at extracting and organizing company information for audit purposes.

CRITICAL RULES:
1. ONLY use information EXPLICITLY stated in the provided sources.
2. DO NOT make up, infer, or hallucinate ANY information.
3. DO NOT add generic industry information not explicitly mentioned.
4. Write in third person and simple present tense.
5. Be concise and factual.

ABSOLUTELY FORBIDDEN:
- NEVER say "information not found", "not available", "no data provided", "could not be determined", or ANY similar phrases.
- NEVER use hedging words: "may", "might", "likely", "appears", "seems".
- NEVER use attribution phrases: "according to", "the website states", "documentation notes".
- If information is not available, simply OMIT that topic and write about what IS available.
- Always produce substantive content based on what you CAN find.`,
    prompt: `${sectionPrompts[section]}

Company: ${organization.name}
Website: ${organization.website}

=== WEBSITE CONTENT ===
${websiteContent}

=== ORGANIZATION CONTEXT ===
${contextHubText || 'No additional context.'}

=== END OF SOURCES ===

Generate the content based on the sources above. Write substantively about what you find - never mention missing information:`,
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

      // Build context from organization data, excluding:
      // 1. Auditor sections (to avoid circular reference)
      // 2. Framework selection (contains raw IDs like "frk_xxx" and isn't relevant to auditor content)
      const auditorQuestions = new Set(Object.values(SECTION_QUESTIONS));
      const excludedQuestions = new Set([
        ...auditorQuestions,
        'Which compliance frameworks do you need?',
      ]);
      const contextHubText = questionsAndAnswers
        .filter((qa) => !excludedQuestions.has(qa.question))
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

          const question = SECTION_QUESTIONS[section];

          // Save to Context table (upsert based on question)
          const existingContext = await db.context.findFirst({
            where: {
              organizationId,
              question,
            },
          });

          if (existingContext) {
            await db.context.update({
              where: { id: existingContext.id },
              data: {
                answer: content,
                tags: ['auditor'],
              },
            });
          } else {
            await db.context.create({
              data: {
                organizationId,
                question,
                answer: content,
                tags: ['auditor'],
              },
            });
          }

          results[section] = content;
          metadata.set(`section_${section}_status`, 'completed');
          metadata.set(`section_${section}_content`, content);
          metadata.increment('completedSections', 1);

          logger.info(`Completed section: ${section} and saved to Context`);
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

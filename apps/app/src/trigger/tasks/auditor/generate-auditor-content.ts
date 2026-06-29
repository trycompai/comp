import { getOrganizationContext } from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { openai } from '@ai-sdk/openai';
import { db } from '@db/server';
import { logger, metadata, schemaTask, tags } from '@trigger.dev/sdk';
import { generateText } from 'ai';
import { z } from 'zod';
import {
  AUDITOR_SYSTEM_PROMPT,
  buildSectionUserPrompt,
  buildVendorsBlock,
  type Section,
  SECTION_QUESTIONS,
  SECTIONS,
} from './generate-auditor-content-prompts';

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
  vendorsBlock: string,
): Promise<string> {
  const { text } = await generateText({
    model: openai('gpt-5.5'),
    system: AUDITOR_SYSTEM_PROMPT,
    prompt: buildSectionUserPrompt({
      section,
      organization,
      websiteContent,
      contextHubText,
      vendorsBlock,
    }),
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
    await tags.add([`org:${organizationId}`]);

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

      // Load the org's Vendors tab — the structured list of vendors the customer
      // curated. CS-589: critical-vendors/subservice content was generated from
      // only the website scrape + Q&A, so the list came back too small and the
      // subservice org was mis-identified. Feed the full vendor list instead.
      const vendorRecords = await db.vendor.findMany({
        where: { organizationId },
        select: { name: true, description: true, category: true, website: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
      const vendorsBlock = buildVendorsBlock(vendorRecords);

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
            vendorsBlock,
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

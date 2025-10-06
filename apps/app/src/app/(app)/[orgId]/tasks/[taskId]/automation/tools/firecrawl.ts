import { openai } from '@ai-sdk/openai';
import { generateObject, tool } from 'ai';
import { z } from 'zod';

const firecrawlSchema = z.object({
  url: z.string().url().describe('The URL of the website to crawl and extract content from'),
  formats: z
    .array(z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot']))
    .default(['markdown'])
    .describe('Formats to return - markdown is usually best for AI processing'),
  onlyMainContent: z
    .boolean()
    .default(true)
    .describe('Whether to extract only the main content, removing navigation, footers, etc.'),
  includeTags: z
    .array(z.string())
    .optional()
    .describe('HTML tags to include in the extraction (e.g., ["article", "main", "div.content"])'),
  excludeTags: z
    .array(z.string())
    .optional()
    .describe('HTML tags to exclude from extraction (e.g., ["nav", "footer", "aside"])'),
  waitFor: z
    .number()
    .min(0)
    .max(10000)
    .optional()
    .describe('Time to wait in ms for JavaScript to load (for dynamic sites)'),
  timeout: z
    .number()
    .min(1000)
    .max(30000)
    .default(15000)
    .describe('Maximum time in ms to wait for the page to load'),
});

export const firecrawlTool = () =>
  tool({
    description:
      'Crawl and extract content from any website using Firecrawl v2 API. This tool can extract clean markdown, HTML, or raw content from web pages, handle JavaScript-rendered sites, and take screenshots. Use this after finding relevant URLs with Exa search to get the full content. Supports modern web apps with dynamic content.',
    inputSchema: firecrawlSchema,
    execute: async (args: unknown) => {
      const parsedArgs = firecrawlSchema.parse(args);

      const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
      if (!FIRECRAWL_API_KEY) {
        throw new Error('FIRECRAWL_API_KEY environment variable is not set');
      }

      try {
        const scrapeParams: any = {
          url: parsedArgs.url,
          formats: parsedArgs.formats,
          onlyMainContent: parsedArgs.onlyMainContent,
          timeout: parsedArgs.timeout,
        };

        // Add optional parameters
        if (parsedArgs.includeTags && parsedArgs.includeTags.length > 0) {
          scrapeParams.includeTags = parsedArgs.includeTags;
        }
        if (parsedArgs.excludeTags && parsedArgs.excludeTags.length > 0) {
          scrapeParams.excludeTags = parsedArgs.excludeTags;
        }
        if (parsedArgs.waitFor !== undefined) {
          scrapeParams.waitFor = parsedArgs.waitFor;
        }

        const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify(scrapeParams),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Firecrawl scrape failed: ${response.status} - ${error}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(`Firecrawl scrape failed: ${data.error || 'Unknown error'}`);
        }

        // Return the scraped content in a structured format
        const result: any = {
          url: parsedArgs.url,
          title: data.data?.metadata?.title || '',
          description: data.data?.metadata?.description || '',
        };

        // Add the requested formats (v2 API structure)
        if (parsedArgs.formats.includes('markdown') && data.data?.markdown) {
          result.markdown = data.data.markdown;
        }
        if (parsedArgs.formats.includes('html') && data.data?.html) {
          result.html = data.data.html;
        }
        if (parsedArgs.formats.includes('rawHtml') && data.data?.rawHtml) {
          result.rawHtml = data.data.rawHtml;
        }
        if (parsedArgs.formats.includes('links') && data.data?.links) {
          result.links = data.data.links;
        }
        if (parsedArgs.formats.includes('screenshot') && data.data?.screenshot) {
          result.screenshot = data.data.screenshot;
        }

        // Add metadata
        result.metadata = {
          sourceURL: data.data?.metadata?.sourceURL || parsedArgs.url,
          pageStatusCode: data.data?.metadata?.pageStatusCode,
          pageError: data.data?.metadata?.pageError,
          ogTitle: data.data?.metadata?.ogTitle,
          ogDescription: data.data?.metadata?.ogDescription,
          ogImage: data.data?.metadata?.ogImage,
        };

        // Generate a structured summary of what was extracted
        let summary = '';
        try {
          const pageInfo = [];
          if (result.title) pageInfo.push(`Title: "${result.title}"`);
          if (result.description) pageInfo.push(`Description: "${result.description}"`);
          if (result.markdown)
            pageInfo.push(`Extracted ${result.markdown.length} characters of content`);

          const summaryResponse = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: z.object({
              action: z.string().describe('What action was performed, e.g. "Visited"'),
              target: z.string().describe('What was visited or targeted'),
              result: z.string().describe('Brief description of what was extracted'),
            }),
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant that summarizes web scraping results in a structured way for non-technical users.',
              },
              {
                role: 'user',
                content: `Summarize what was extracted from this webpage:\n\nURL: ${parsedArgs.url}\n${pageInfo.join('\n')}`,
              },
            ],
            maxRetries: 1,
          });

          // Format as a readable string
          summary = `${summaryResponse.object.action} ${summaryResponse.object.target} - ${summaryResponse.object.result}`;
        } catch (err) {
          // If summary generation fails, just continue without it
          console.error('Failed to generate summary:', err);
        }

        result.summary = summary;
        return result;
      } catch (error) {
        console.error('Firecrawl error:', error);
        throw new Error(
          `Failed to crawl with Firecrawl: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
  });

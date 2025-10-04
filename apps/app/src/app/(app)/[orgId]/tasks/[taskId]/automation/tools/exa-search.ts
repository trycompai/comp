import { openai } from '@ai-sdk/openai';
import { generateObject, tool } from 'ai';
import { z } from 'zod';

const exaSearchSchema = z.object({
  query: z.string().min(1).describe('The search query to find relevant web content'),
  numResults: z.number().min(1).max(10).default(5).describe('Number of search results to return'),
  category: z
    .enum([
      'general',
      'company',
      'research_paper',
      'news',
      'github',
      'tweet',
      'movie',
      'song',
      'personal_site',
      'pdf',
    ])
    .default('general')
    .describe('Category to search within'),
  startPublishedDate: z
    .string()
    .optional()
    .describe('Start date for filtering results (ISO format: YYYY-MM-DD)'),
  endPublishedDate: z
    .string()
    .optional()
    .describe('End date for filtering results (ISO format: YYYY-MM-DD)'),
  useAutoprompt: z
    .boolean()
    .default(true)
    .describe('Whether to enhance the query with additional context for better results'),
  type: z
    .enum(['keyword', 'neural'])
    .default('neural')
    .describe('Search type - neural for semantic search, keyword for exact matches'),
});

export const exaSearchTool = () =>
  tool({
    description:
      'Search the web using Exa AI for relevant, high-quality content. Exa uses neural search to find semantically similar content beyond just keyword matching. Use this to find documentation, articles, research papers, and other web content.',
    inputSchema: exaSearchSchema,
    execute: async (args: unknown) => {
      const parsedArgs = exaSearchSchema.parse(args);

      const EXA_API_KEY = process.env.EXA_API_KEY;
      if (!EXA_API_KEY) {
        throw new Error('EXA_API_KEY environment variable is not set');
      }

      try {
        const searchParams: any = {
          query: parsedArgs.query,
          num_results: parsedArgs.numResults,
          category: parsedArgs.category,
          use_autoprompt: parsedArgs.useAutoprompt,
          type: parsedArgs.type,
        };

        // Add optional date filters
        if (parsedArgs.startPublishedDate) {
          searchParams.start_published_date = parsedArgs.startPublishedDate;
        }
        if (parsedArgs.endPublishedDate) {
          searchParams.end_published_date = parsedArgs.endPublishedDate;
        }

        const response = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': EXA_API_KEY,
          },
          body: JSON.stringify(searchParams),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Exa search failed: ${response.status} - ${error}`);
        }

        const data = await response.json();

        // Format the results for the AI to use
        const formattedResults = data.results.map((result: any) => ({
          title: result.title,
          url: result.url,
          snippet: result.text || result.snippet || '',
          publishedDate: result.published_date,
          author: result.author,
          score: result.score,
        }));

        // Generate a structured summary of what was found
        let summary = '';
        try {
          const summaryResponse = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: z.object({
              action: z.string().describe('What action was performed, e.g. "Searched for"'),
              target: z.string().describe('What was searched for or targeted'),
              result: z.string().describe('Brief description of what was found'),
            }),
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant that summarizes search results in a structured way for non-technical users.',
              },
              {
                role: 'user',
                content: `Summarize this search:\n\nQuery: "${parsedArgs.query}"\nFound ${data.results.length} results.\n\nTop results:\n${formattedResults
                  .slice(0, 3)
                  .map((r: any) => `- ${r.title}`)
                  .join('\n')}`,
              },
            ],
            maxRetries: 1,
          });

          // Format as a readable string
          summary = `${summaryResponse.object.action} "${summaryResponse.object.target}" - ${summaryResponse.object.result}`;
        } catch (err) {
          // If summary generation fails, just continue without it
          console.error('Failed to generate summary:', err);
        }

        return {
          query: parsedArgs.query,
          totalResults: data.results.length,
          results: formattedResults,
          summary,
        };
      } catch (error) {
        console.error('Exa search error:', error);
        throw new Error(
          `Failed to search with Exa: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
  });

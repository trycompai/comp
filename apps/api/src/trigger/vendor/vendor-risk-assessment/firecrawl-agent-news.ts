// apps/api/src/trigger/vendor/vendor-risk-assessment/firecrawl-agent-news.ts
import { logger } from '@trigger.dev/sdk';
import type { VendorRiskAssessmentNewsItem } from './agent-types';
import {
  handleFirecrawlError,
  normalizeIso,
  normalizeUrl,
  setupFirecrawlClient,
} from './firecrawl-agent-shared';

const newsResponseSchema = {
  type: 'object' as const,
  properties: {
    news: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          date: { type: 'string' as const },
          title: { type: 'string' as const },
          summary: { type: 'string' as const },
          source: { type: 'string' as const },
          url: { type: 'string' as const },
          sentiment: {
            type: 'string' as const,
            enum: ['positive', 'negative', 'neutral'],
          },
        },
        required: ['date', 'title'],
      },
    },
  },
  required: ['news'],
};

export async function firecrawlResearchNews(params: {
  vendorName: string;
  vendorWebsite: string;
}): Promise<VendorRiskAssessmentNewsItem[] | null> {
  const setup = setupFirecrawlClient(params);
  if (!setup) return null;

  const { firecrawlClient, origin } = setup;
  const { vendorName, vendorWebsite } = params;

  const prompt = `Find recent news articles (last 12 months) about the company "${vendorName}" (${vendorWebsite}), especially:
- Security incidents or data breaches
- Funding rounds or acquisitions
- Lawsuits or regulatory actions
- Major partnerships or product updates
- Leadership changes

Search press releases, reputable news sources, and the company's blog/newsroom.`;

  let agentResponse;
  try {
    agentResponse = await firecrawlClient.agent({
      prompt,
      urls: [origin, `${origin}/blog`, `${origin}/newsroom`, `${origin}/press`],
      strictConstrainToURLs: false,
      maxCredits: 300,
      timeout: 360,
      pollInterval: 5,
      schema: newsResponseSchema,
    });
  } catch (error) {
    return handleFirecrawlError(error, { vendorName, vendorWebsite, callType: 'news' });
  }

  if (!agentResponse.success || agentResponse.status === 'failed') {
    logger.warn('Firecrawl news research job did not complete successfully', {
      vendorWebsite,
      status: agentResponse.status,
      error: agentResponse.error,
    });
    return null;
  }

  const data = agentResponse.data as { news?: Array<Record<string, unknown>> } | undefined;
  const rawNews = data?.news;
  if (!Array.isArray(rawNews) || rawNews.length === 0) {
    logger.info('Firecrawl news research returned no news items', { vendorWebsite });
    return null;
  }

  const news = rawNews
    .flatMap((n) => {
      const isoDate = normalizeIso(n.date as string | undefined);
      if (!isoDate) return [];
      return [{
        date: isoDate,
        title: (n.title as string) ?? '',
        summary: (n.summary as string) ?? null,
        source: (n.source as string) ?? null,
        url: normalizeUrl(n.url as string | undefined),
        sentiment: (n.sentiment as 'positive' | 'negative' | 'neutral') ?? null,
      }];
    })
    .filter(Boolean);

  logger.info('Firecrawl news research completed', {
    vendorWebsite,
    found: { news: news.length },
  });

  return news.length > 0 ? news : null;
}

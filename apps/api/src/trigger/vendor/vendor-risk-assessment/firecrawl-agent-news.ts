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
      description:
        'Recent news articles about the company from the last 12 months, ordered by date descending',
      items: {
        type: 'object' as const,
        properties: {
          date: {
            type: 'string' as const,
            description: 'Publication date in ISO 8601 format (YYYY-MM-DD)',
          },
          title: {
            type: 'string' as const,
            description: 'Article headline or title',
          },
          summary: {
            type: 'string' as const,
            description: 'One to two sentence summary of the article content',
          },
          source: {
            type: 'string' as const,
            description:
              'Publication name, e.g. TechCrunch, Reuters, company blog',
          },
          url: {
            type: 'string' as const,
            description: 'Direct URL to the article',
          },
          sentiment: {
            type: 'string' as const,
            enum: ['positive', 'negative', 'neutral'],
            description:
              'Whether the news is positive (funding, partnerships), negative (breaches, lawsuits), or neutral',
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

  const prompt = `Find recent news articles (last 12 months) about the company "${vendorName}" (${vendorWebsite}).

Prioritize these categories (from most to least important):
1. **Security incidents**: Data breaches, vulnerabilities, security failures, incident reports
2. **Regulatory & legal**: Lawsuits, fines, regulatory actions, compliance issues, government investigations
3. **Funding & acquisitions**: Funding rounds, M&A activity, IPO news, valuation changes
4. **Product & partnerships**: Major product launches, strategic partnerships, platform changes
5. **Leadership**: C-suite changes, key hires, departures

Search the company's blog, newsroom, press releases, and reputable tech news sources (TechCrunch, Reuters, Bloomberg, The Verge, etc). Return up to 10 most significant items, prioritizing security-relevant news.`;

  let agentResponse;
  try {
    agentResponse = await firecrawlClient.agent({
      prompt,
      urls: [origin, `${origin}/blog`, `${origin}/newsroom`, `${origin}/press`],
      strictConstrainToURLs: false,
      maxCredits: 2500,
      timeout: 360,
      pollInterval: 5,
      ...({ model: 'spark-1-pro' } as Record<string, unknown>),
      schema: newsResponseSchema,
    });
  } catch (error) {
    return handleFirecrawlError(error, {
      vendorName,
      vendorWebsite,
      callType: 'news',
    });
  }

  if (!agentResponse.success || agentResponse.status === 'failed') {
    logger.warn('Firecrawl news research job did not complete successfully', {
      vendorWebsite,
      status: agentResponse.status,
      error: agentResponse.error,
    });
    return null;
  }

  const data = agentResponse.data as
    | { news?: Array<Record<string, unknown>> }
    | undefined;
  const rawNews = data?.news;
  if (!Array.isArray(rawNews) || rawNews.length === 0) {
    logger.info('Firecrawl news research returned no news items', {
      vendorWebsite,
    });
    return null;
  }

  const news = rawNews
    .flatMap((n) => {
      const isoDate = normalizeIso(n.date as string | undefined);
      if (!isoDate) return [];
      return [
        {
          date: isoDate,
          title: (n.title as string) ?? '',
          summary: (n.summary as string) ?? null,
          source: (n.source as string) ?? null,
          url: normalizeUrl(n.url as string | undefined),
          sentiment:
            (n.sentiment as 'positive' | 'negative' | 'neutral') ?? null,
        },
      ];
    })
    .filter(Boolean);

  logger.info('Firecrawl news research completed', {
    vendorWebsite,
    found: { news: news.length },
  });

  return news.length > 0 ? news : null;
}

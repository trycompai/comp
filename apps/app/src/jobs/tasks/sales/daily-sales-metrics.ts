import { logger, schedules } from '@trigger.dev/sdk';
import axios from 'axios';

// Sales targets configuration
const SALES_TARGETS = {
  demos: {
    weekly: 15, // # of demos booked per week target
    monthly: 60, // # of demos booked per month target
  },
  pipeline: {
    weekly: 50000, // $ pipeline added per week target
    monthly: 200000, // $ pipeline added per month target
  },
  arr: {
    weekly: 12500, // $ ARR added per week target
    monthly: 50000, // $ ARR added per month target
  },
};

// Slack channel ID
const SLACK_CHANNEL_ID = 'C08PFNY68AX';

interface HubSpotDeal {
  id: string;
  properties: {
    createdate: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    hs_analytics_source?: string;
    closedate?: string;
  };
}

interface HubSpotEmailStats {
  totalSent: number;
  campaigns: Array<{
    name: string;
    sent: number;
    date: string;
  }>;
}

interface DemoMetrics {
  thisWeek: number;
  thisMonth: number;
  weeklyTarget: number;
  monthlyTarget: number;
  weeklyAttainment: number;
  monthlyAttainment: number;
}

interface PipelineMetrics {
  thisWeek: number;
  thisMonth: number;
  weeklyTarget: number;
  monthlyTarget: number;
  weeklyAttainment: number;
  monthlyAttainment: number;
}

interface ARRMetrics {
  thisWeek: number;
  thisMonth: number;
  weeklyTarget: number;
  monthlyTarget: number;
  weeklyAttainment: number;
  monthlyAttainment: number;
}

interface SourceMetrics {
  source: string;
  count: number;
  percentage: number;
}

/**
 * Get the start of the current week (Monday 00:00:00 UTC)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust when day is sunday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the start of the current month (1st 00:00:00 UTC)
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Fetch demos booked from HubSpot
 */
async function fetchDemosBooked(hubspotApiKey: string): Promise<HubSpotDeal[]> {
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  try {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/deals/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'dealstage',
                operator: 'EQ',
                value: 'demo_booked', // Adjust based on your HubSpot deal stage
              },
              {
                propertyName: 'createdate',
                operator: 'GTE',
                value: monthStart.getTime().toString(),
              },
            ],
          },
        ],
        properties: ['createdate', 'amount', 'dealstage', 'hs_analytics_source', 'pipeline'],
        limit: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.results || [];
  } catch (error) {
    logger.error('Failed to fetch demos from HubSpot', { error });
    return [];
  }
}

/**
 * Fetch pipeline data from HubSpot
 */
async function fetchPipelineData(hubspotApiKey: string): Promise<HubSpotDeal[]> {
  const monthStart = getMonthStart();

  try {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/deals/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'createdate',
                operator: 'GTE',
                value: monthStart.getTime().toString(),
              },
            ],
          },
        ],
        properties: ['createdate', 'amount', 'dealstage', 'hs_analytics_source', 'pipeline'],
        limit: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.results || [];
  } catch (error) {
    logger.error('Failed to fetch pipeline data from HubSpot', { error });
    return [];
  }
}

/**
 * Fetch closed won deals (ARR) from HubSpot
 */
async function fetchClosedWonDeals(hubspotApiKey: string): Promise<HubSpotDeal[]> {
  const monthStart = getMonthStart();

  try {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/deals/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'dealstage',
                operator: 'EQ',
                value: 'closedwon', // Adjust based on your HubSpot deal stage
              },
              {
                propertyName: 'closedate',
                operator: 'GTE',
                value: monthStart.getTime().toString(),
              },
            ],
          },
        ],
        properties: ['createdate', 'closedate', 'amount', 'dealstage', 'hs_analytics_source'],
        limit: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.results || [];
  } catch (error) {
    logger.error('Failed to fetch closed won deals from HubSpot', { error });
    return [];
  }
}

/**
 * Fetch email statistics from HubSpot Marketing Emails API
 */
async function fetchEmailStats(hubspotApiKey: string): Promise<HubSpotEmailStats> {
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  try {
    // Fetch marketing email statistics
    const response = await axios.get(
      'https://api.hubapi.com/marketing/v3/emails/statistics/list',
      {
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          startTimestamp: monthStart.toISOString(),
          limit: 100,
        },
      }
    );

    const emails = response.data.results || [];
    let totalSent = 0;
    const campaigns: HubSpotEmailStats['campaigns'] = [];

    for (const email of emails) {
      const sent = email.counters?.sent || 0;
      totalSent += sent;

      if (sent > 0) {
        campaigns.push({
          name: email.name || 'Unnamed Campaign',
          sent,
          date: email.publishDate || email.created,
        });
      }
    }

    // Sort campaigns by sent count (descending)
    campaigns.sort((a, b) => b.sent - a.sent);

    return {
      totalSent,
      campaigns: campaigns.slice(0, 5), // Top 5 campaigns
    };
  } catch (error) {
    logger.error('Failed to fetch email stats from HubSpot', { error });
    return { totalSent: 0, campaigns: [] };
  }
}

/**
 * Calculate demo metrics
 */
function calculateDemoMetrics(deals: HubSpotDeal[]): DemoMetrics {
  const weekStart = getWeekStart();

  const thisWeek = deals.filter(
    (deal) => new Date(deal.properties.createdate) >= weekStart
  ).length;

  const thisMonth = deals.length;

  return {
    thisWeek,
    thisMonth,
    weeklyTarget: SALES_TARGETS.demos.weekly,
    monthlyTarget: SALES_TARGETS.demos.monthly,
    weeklyAttainment: Math.round((thisWeek / SALES_TARGETS.demos.weekly) * 100),
    monthlyAttainment: Math.round((thisMonth / SALES_TARGETS.demos.monthly) * 100),
  };
}

/**
 * Calculate pipeline metrics
 */
function calculatePipelineMetrics(deals: HubSpotDeal[]): PipelineMetrics {
  const weekStart = getWeekStart();

  const thisWeekDeals = deals.filter(
    (deal) => new Date(deal.properties.createdate) >= weekStart
  );

  const thisWeek = thisWeekDeals.reduce(
    (sum, deal) => sum + (parseFloat(deal.properties.amount || '0') || 0),
    0
  );

  const thisMonth = deals.reduce(
    (sum, deal) => sum + (parseFloat(deal.properties.amount || '0') || 0),
    0
  );

  return {
    thisWeek,
    thisMonth,
    weeklyTarget: SALES_TARGETS.pipeline.weekly,
    monthlyTarget: SALES_TARGETS.pipeline.monthly,
    weeklyAttainment: Math.round((thisWeek / SALES_TARGETS.pipeline.weekly) * 100),
    monthlyAttainment: Math.round((thisMonth / SALES_TARGETS.pipeline.monthly) * 100),
  };
}

/**
 * Calculate ARR metrics
 */
function calculateARRMetrics(deals: HubSpotDeal[]): ARRMetrics {
  const weekStart = getWeekStart();

  const thisWeekDeals = deals.filter((deal) => {
    const closeDate = deal.properties.closedate;
    return closeDate && new Date(closeDate) >= weekStart;
  });

  const thisWeek = thisWeekDeals.reduce(
    (sum, deal) => sum + (parseFloat(deal.properties.amount || '0') || 0),
    0
  );

  const thisMonth = deals.reduce(
    (sum, deal) => sum + (parseFloat(deal.properties.amount || '0') || 0),
    0
  );

  return {
    thisWeek,
    thisMonth,
    weeklyTarget: SALES_TARGETS.arr.weekly,
    monthlyTarget: SALES_TARGETS.arr.monthly,
    weeklyAttainment: Math.round((thisWeek / SALES_TARGETS.arr.weekly) * 100),
    monthlyAttainment: Math.round((thisMonth / SALES_TARGETS.arr.monthly) * 100),
  };
}

/**
 * Calculate top sources from deals
 */
function calculateTopSources(deals: HubSpotDeal[]): SourceMetrics[] {
  const sourceCounts: Record<string, number> = {};

  for (const deal of deals) {
    const source = deal.properties.hs_analytics_source || 'Unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  }

  const totalDeals = deals.length || 1;

  const sources = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      count,
      percentage: Math.round((count / totalDeals) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 sources

  return sources;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get attainment emoji based on percentage
 */
function getAttainmentEmoji(percentage: number): string {
  if (percentage >= 100) return '🎯';
  if (percentage >= 75) return '📈';
  if (percentage >= 50) return '⚡';
  if (percentage >= 25) return '🔄';
  return '⚠️';
}

// Slack Block types
type SlackBlock =
  | { type: 'header'; text: { type: 'plain_text'; text: string; emoji: boolean } }
  | { type: 'divider' }
  | { type: 'section'; text: { type: 'mrkdwn'; text: string }; fields?: never }
  | { type: 'section'; fields: Array<{ type: 'mrkdwn'; text: string }>; text?: never }
  | { type: 'context'; elements: Array<{ type: 'mrkdwn'; text: string }> };

/**
 * Build Slack message blocks
 */
function buildSlackMessage(
  demoMetrics: DemoMetrics,
  pipelineMetrics: PipelineMetrics,
  arrMetrics: ARRMetrics,
  topSources: SourceMetrics[],
  emailStats: HubSpotEmailStats
): { blocks: SlackBlock[] } {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 Daily Sales Metrics Report - ${today}`,
        emoji: true,
      },
    },
    {
      type: 'divider',
    },
    // Demos Section
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*📅 DEMOS BOOKED*',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*This Week:*\n${demoMetrics.thisWeek} / ${demoMetrics.weeklyTarget} ${getAttainmentEmoji(demoMetrics.weeklyAttainment)}\n_${demoMetrics.weeklyAttainment}% attainment_`,
        },
        {
          type: 'mrkdwn',
          text: `*This Month:*\n${demoMetrics.thisMonth} / ${demoMetrics.monthlyTarget} ${getAttainmentEmoji(demoMetrics.monthlyAttainment)}\n_${demoMetrics.monthlyAttainment}% attainment_`,
        },
      ],
    },
    {
      type: 'divider',
    },
    // Pipeline Section
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*💰 PIPELINE ADDED*',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*This Week:*\n${formatCurrency(pipelineMetrics.thisWeek)} / ${formatCurrency(pipelineMetrics.weeklyTarget)} ${getAttainmentEmoji(pipelineMetrics.weeklyAttainment)}\n_${pipelineMetrics.weeklyAttainment}% attainment_`,
        },
        {
          type: 'mrkdwn',
          text: `*This Month:*\n${formatCurrency(pipelineMetrics.thisMonth)} / ${formatCurrency(pipelineMetrics.monthlyTarget)} ${getAttainmentEmoji(pipelineMetrics.monthlyAttainment)}\n_${pipelineMetrics.monthlyAttainment}% attainment_`,
        },
      ],
    },
    {
      type: 'divider',
    },
    // ARR Section
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*🏆 ARR ADDED (Closed Won)*',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*This Week:*\n${formatCurrency(arrMetrics.thisWeek)} / ${formatCurrency(arrMetrics.weeklyTarget)} ${getAttainmentEmoji(arrMetrics.weeklyAttainment)}\n_${arrMetrics.weeklyAttainment}% attainment_`,
        },
        {
          type: 'mrkdwn',
          text: `*This Month:*\n${formatCurrency(arrMetrics.thisMonth)} / ${formatCurrency(arrMetrics.monthlyTarget)} ${getAttainmentEmoji(arrMetrics.monthlyAttainment)}\n_${arrMetrics.monthlyAttainment}% attainment_`,
        },
      ],
    },
    {
      type: 'divider',
    },
    // Top Sources Section
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*📈 TOP LEAD SOURCES (This Month)*',
      },
    },
  ];

  // Add top sources as a formatted list
  if (topSources.length > 0) {
    const sourcesText = topSources
      .map((source, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
        return `${medal} ${source.source}: ${source.count} deals (${source.percentage}%)`;
      })
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: sourcesText,
      },
    });
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_No source data available_',
      },
    });
  }

  blocks.push({
    type: 'divider',
  });

  // HubSpot Email Stats Section
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*📧 HUBSPOT EMAIL ACTIVITY (This Month)*',
    },
  });

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Total Emails Sent:* ${emailStats.totalSent.toLocaleString()}`,
    },
  });

  if (emailStats.campaigns.length > 0) {
    const campaignsText = emailStats.campaigns
      .map((campaign, index) => `${index + 1}. *${campaign.name}*: ${campaign.sent.toLocaleString()} sent`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Top Email Campaigns:*\n${campaignsText}`,
      },
    });
  }

  // Footer
  blocks.push({
    type: 'divider',
  });

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `📊 _Data sourced from HubSpot • Generated at ${new Date().toISOString()}_`,
      },
    ],
  });

  return { blocks };
}

/**
 * Send message to Slack webhook
 */
async function sendToSlack(
  webhookUrl: string,
  message: ReturnType<typeof buildSlackMessage>
): Promise<boolean> {
  try {
    const response = await axios.post(webhookUrl, message, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.status === 200;
  } catch (error) {
    logger.error('Failed to send message to Slack', { error });
    return false;
  }
}

/**
 * Daily Sales Metrics Scheduled Task
 *
 * Posts daily sales metrics to Slack channel #C08PFNY68AX
 * Runs every day at 9:00 AM EST (2:00 PM UTC)
 */
export const dailySalesMetrics = schedules.task({
  id: 'daily-sales-metrics',
  cron: '0 14 * * *', // 9:00 AM EST (2:00 PM UTC) - runs Monday through Friday
  maxDuration: 1000 * 60 * 5, // 5 minutes
  run: async () => {
    logger.info('Starting daily sales metrics job');

    // Get environment variables
    const slackWebhookUrl = process.env.SLACK_SALES_WEBHOOK;
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;

    if (!slackWebhookUrl) {
      logger.error('SLACK_SALES_WEBHOOK environment variable is not set');
      return {
        success: false,
        error: 'SLACK_SALES_WEBHOOK not configured',
      };
    }

    if (!hubspotApiKey) {
      logger.error('HUBSPOT_API_KEY environment variable is not set');
      return {
        success: false,
        error: 'HUBSPOT_API_KEY not configured',
      };
    }

    try {
      // Fetch data from HubSpot in parallel
      const [demoDeals, pipelineDeals, closedWonDeals, emailStats] = await Promise.all([
        fetchDemosBooked(hubspotApiKey),
        fetchPipelineData(hubspotApiKey),
        fetchClosedWonDeals(hubspotApiKey),
        fetchEmailStats(hubspotApiKey),
      ]);

      logger.info('Fetched data from HubSpot', {
        demoDealsCount: demoDeals.length,
        pipelineDealsCount: pipelineDeals.length,
        closedWonDealsCount: closedWonDeals.length,
        totalEmailsSent: emailStats.totalSent,
      });

      // Calculate metrics
      const demoMetrics = calculateDemoMetrics(demoDeals);
      const pipelineMetrics = calculatePipelineMetrics(pipelineDeals);
      const arrMetrics = calculateARRMetrics(closedWonDeals);
      const topSources = calculateTopSources(pipelineDeals);

      logger.info('Calculated metrics', {
        demoMetrics,
        pipelineMetrics,
        arrMetrics,
        topSourcesCount: topSources.length,
      });

      // Build and send Slack message
      const slackMessage = buildSlackMessage(
        demoMetrics,
        pipelineMetrics,
        arrMetrics,
        topSources,
        emailStats
      );

      const sent = await sendToSlack(slackWebhookUrl, slackMessage);

      if (!sent) {
        return {
          success: false,
          error: 'Failed to send Slack message',
        };
      }

      logger.info('Daily sales metrics posted to Slack successfully');

      return {
        success: true,
        timestamp: new Date().toISOString(),
        metrics: {
          demos: demoMetrics,
          pipeline: pipelineMetrics,
          arr: arrMetrics,
          topSources: topSources.length,
          emailsSent: emailStats.totalSent,
        },
      };
    } catch (error) {
      logger.error('Error in daily sales metrics job', { error });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

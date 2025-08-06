export const getPricingFeatures = (t: (content: string) => string) => ({
  starter: [
    t('Access to all frameworks'),
    t('Trust & Security Portal'),
    t('AI Vendor Management'),
    t('AI Risk Management'),
    t('Unlimited team members'),
    t('API access'),
    t('Community Support'),
  ],
  managed: [
    t('Any Framework'),
    t('3rd Party Audit Included'),
    t('Compliant in 14 Days or Less'),
    t('Dedicated Success Team'),
    t('24x7x365 Support & SLA'),
    t('Slack Channel with Comp AI'),
  ],
});

export const PRICING_DEFAULTS = {
  starter: {
    monthly: 99,
    yearlyTotal: 948, // 20% discount
  },
  managed: {
    monthly: 997,
    yearlyTotal: 9564, // 20% discount
  },
} as const;

export const PLAN_TYPES = {
  starter: 'starter',
  managed: 'done-for-you',
} as const;

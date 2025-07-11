export const PRICING_FEATURES = {
  starter: [
    'Access to all frameworks',
    'Trust & Security Portal',
    'AI Vendor Management',
    'AI Risk Management',
    'Unlimited team members',
    'API access',
    'Community Support',
  ],
  managed: [
    'Any Framework',
    '3rd Party Audit Included',
    'Compliant in 14 Days or Less',
    'Dedicated Success Team',
    '24x7x365 Support & SLA',
    'Slack Channel with Comp AI',
  ],
} as const;

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

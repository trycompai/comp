import { db } from '@db';
import { changeSubscriptionPlan } from './billing-subscription-plans';

jest.mock('@db', () => ({
  db: {
    organizationBillingSubscription: { update: jest.fn() },
  },
}));

const mockedDb = db as unknown as {
  organizationBillingSubscription: { update: jest.Mock };
};

describe('changeSubscriptionPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.organizationBillingSubscription.update.mockResolvedValue({});
  });

  it('includes the source plan and local state version in the Stripe idempotency key', async () => {
    const subscriptionsUpdate = jest.fn().mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      canceled_at: null,
      items: {
        data: [
          {
            id: 'si_1',
            current_period_start: 1775001600,
            current_period_end: 1777593600,
          },
        ],
      },
    });

    await changeSubscriptionPlan({
      organizationId: 'org_1',
      subscription: {
        id: 'obs_1',
        skuKey: 'pentest_monthly_3',
        stripeStatus: 'active',
        stripeSubscriptionId: 'sub_1',
        stripeSubscriptionItemId: 'si_1',
        currentPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-30T10:00:00.000Z'),
      },
      skuKey: 'pentest_monthly_5_current',
      stripePriceId: 'price_next',
      includedQuantity: 5,
      stripeService: {
        getClient: () => ({
          subscriptions: { update: subscriptionsUpdate },
        }),
      } as never,
      entitlements: { writeAuditEvent: jest.fn() } as never,
    });

    expect(subscriptionsUpdate).toHaveBeenCalledWith(
      'sub_1',
      expect.anything(),
      {
        idempotencyKey: [
          'subscription-plan-change-v2',
          'org_1',
          'si_1',
          'pentest_monthly_3',
          'pentest_monthly_5_current',
          new Date('2026-04-30T10:00:00.000Z').getTime(),
        ].join(':'),
      },
    );
  });
});

import { createAdminSubscription } from './admin-billing.data';

jest.mock('@db', () => ({
  db: {},
  Prisma: {},
}));

describe('createAdminSubscription', () => {
  it('uses a stable Stripe idempotency key for subscription create retries', async () => {
    const subscription = {
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      canceled_at: null,
      items: {
        data: [
          {
            id: 'si_1',
            current_period_start: 1777564800,
            current_period_end: 1780243200,
          },
        ],
      },
    };
    const subscriptionsCreate = jest.fn().mockResolvedValue(subscription);
    const entitlements = { syncSubscriptionItem: jest.fn() };

    await createAdminSubscription({
      organizationId: 'org_1',
      stripeCustomerId: 'cus_1',
      skuKey: 'pentest_monthly_1',
      stripePriceId: 'price_1',
      includedQuantity: 1,
      idempotencyKey:
        'admin-subscription-create:org_1:pentest_monthly_1:cus_1:none',
      stripeService: {
        getClient: () => ({
          subscriptions: { create: subscriptionsCreate },
        }),
      } as never,
      entitlements: entitlements as never,
    });
    await createAdminSubscription({
      organizationId: 'org_1',
      stripeCustomerId: 'cus_1',
      skuKey: 'pentest_monthly_1',
      stripePriceId: 'price_1',
      includedQuantity: 1,
      idempotencyKey:
        'admin-subscription-create:org_1:pentest_monthly_1:cus_1:none',
      stripeService: {
        getClient: () => ({
          subscriptions: { create: subscriptionsCreate },
        }),
      } as never,
      entitlements: entitlements as never,
    });

    const firstKey = subscriptionsCreate.mock.calls[0][1].idempotencyKey;
    const secondKey = subscriptionsCreate.mock.calls[1][1].idempotencyKey;
    expect(firstKey).toBe(
      'admin-subscription-create:org_1:pentest_monthly_1:cus_1:none',
    );
    expect(secondKey).toBe(firstKey);
  });
});

import { db } from '@db';
import Stripe from 'stripe';
import { BillingWebhookService } from './billing-webhook.service';
import type { BillingEntitlementsService } from './billing-entitlements.service';
import type { StripeService } from '../stripe/stripe.service';

jest.mock('@db', () => ({
  db: {
    organizationBilling: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedDb = db as unknown as {
  organizationBilling: {
    findFirst: jest.Mock;
  };
};

function mockStripeSubscription(params: {
  status: Stripe.Subscription.Status;
  cancelAtPeriodEnd: boolean;
}): Stripe.Subscription {
  return {
    id: 'sub_trial',
    status: params.status,
    cancel_at_period_end: params.cancelAtPeriodEnd,
    canceled_at: params.status === 'canceled' ? 1777593600 : null,
    customer: 'cus_1',
    metadata: { organizationId: 'org_1' },
    items: {
      data: [
        {
          id: 'si_1',
          price: { id: 'price_1TS3ziCkFWhKYvHI0H5TWxNI' },
          current_period_start: 1775001600,
          current_period_end: 1777593600,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

function mockSubscriptionEvent(
  subscription: Stripe.Subscription,
): Stripe.Event {
  return {
    id: 'evt_trial_cancel',
    type: 'customer.subscription.updated',
    data: { object: subscription },
  } as unknown as Stripe.Event;
}

describe('BillingWebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.organizationBilling.findFirst.mockResolvedValue(null);
  });

  it('cancels trial subscriptions immediately when Stripe schedules cancellation at period end', async () => {
    const canceledSubscription = mockStripeSubscription({
      status: 'canceled',
      cancelAtPeriodEnd: false,
    });
    const subscriptionsCancel = jest.fn().mockResolvedValue(canceledSubscription);
    const syncSubscriptionItem = jest.fn().mockResolvedValue(undefined);
    const writeAuditEvent = jest.fn().mockResolvedValue(undefined);
    const service = new BillingWebhookService(
      {
        getClient: () => ({
          subscriptions: { cancel: subscriptionsCancel, retrieve: jest.fn() },
        }),
      } as unknown as StripeService,
      {
        syncSubscriptionItem,
        writeAuditEvent,
      } as unknown as BillingEntitlementsService,
    );

    await (
      service as unknown as {
        syncSubscriptionFromEvent(event: Stripe.Event): Promise<void>;
      }
    ).syncSubscriptionFromEvent(
      mockSubscriptionEvent(
        mockStripeSubscription({
          status: 'trialing',
          cancelAtPeriodEnd: true,
        }),
      ),
    );

    expect(subscriptionsCancel).toHaveBeenCalledWith(
      'sub_trial',
      {
        cancellation_details: {
          comment:
            'Trial cancellation takes effect immediately to revoke unused included usage.',
        },
      },
    );
    expect(syncSubscriptionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        skuKey: 'pentest_monthly_1',
        stripeStatus: 'canceled',
        cancelAtPeriodEnd: false,
        canceledAt: new Date('2026-05-01T00:00:00.000Z'),
      }),
    );
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        eventType: 'trial_subscription_canceled_immediately',
        stripeEventId: 'evt_trial_cancel',
      }),
    );
  });

  it('does not force immediate cancellation for active paid subscriptions', async () => {
    const subscriptionsCancel = jest.fn();
    const syncSubscriptionItem = jest.fn().mockResolvedValue(undefined);
    const service = new BillingWebhookService(
      {
        getClient: () => ({
          subscriptions: { cancel: subscriptionsCancel },
        }),
      } as unknown as StripeService,
      {
        syncSubscriptionItem,
        writeAuditEvent: jest.fn(),
      } as unknown as BillingEntitlementsService,
    );

    await (
      service as unknown as {
        syncSubscriptionFromEvent(event: Stripe.Event): Promise<void>;
      }
    ).syncSubscriptionFromEvent(
      mockSubscriptionEvent(
        mockStripeSubscription({
          status: 'active',
          cancelAtPeriodEnd: true,
        }),
      ),
    );

    expect(subscriptionsCancel).not.toHaveBeenCalled();
    expect(syncSubscriptionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeStatus: 'active',
        cancelAtPeriodEnd: true,
      }),
    );
  });

  it('syncs canceled state when a retry finds the trial already canceled in Stripe', async () => {
    const canceledSubscription = mockStripeSubscription({
      status: 'canceled',
      cancelAtPeriodEnd: false,
    });
    const subscriptionsCancel = jest
      .fn()
      .mockRejectedValue(new Error('Subscription is already canceled'));
    const subscriptionsRetrieve = jest.fn().mockResolvedValue(canceledSubscription);
    const syncSubscriptionItem = jest.fn().mockResolvedValue(undefined);
    const service = new BillingWebhookService(
      {
        getClient: () => ({
          subscriptions: {
            cancel: subscriptionsCancel,
            retrieve: subscriptionsRetrieve,
          },
        }),
      } as unknown as StripeService,
      {
        syncSubscriptionItem,
        writeAuditEvent: jest.fn(),
      } as unknown as BillingEntitlementsService,
    );

    await (
      service as unknown as {
        syncSubscriptionFromEvent(event: Stripe.Event): Promise<void>;
      }
    ).syncSubscriptionFromEvent(
      mockSubscriptionEvent(
        mockStripeSubscription({
          status: 'trialing',
          cancelAtPeriodEnd: true,
        }),
      ),
    );

    expect(subscriptionsRetrieve).toHaveBeenCalledWith('sub_trial', {
      expand: ['items.data.price'],
    });
    expect(syncSubscriptionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeStatus: 'canceled',
        cancelAtPeriodEnd: false,
      }),
    );
  });
});

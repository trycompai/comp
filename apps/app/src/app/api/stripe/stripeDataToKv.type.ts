import Stripe from 'stripe';

export type STRIPE_SUB_CACHE =
  | {
      subscriptionId: string | null;
      status: Stripe.Subscription.Status;
      priceId: string | null;
      currentPeriodStart: number | null;
      currentPeriodEnd: number | null;
      cancelAtPeriodEnd: boolean;
      price: {
        nickname: string | null;
        unit_amount: number | null;
        currency: string;
        interval: Stripe.Price.Recurring.Interval | null;
      } | null;
      product: {
        name: string;
      } | null;
      paymentMethod: {
        brand: string | null; // e.g., "visa", "mastercard"
        last4: string | null; // e.g., "4242"
      } | null;
    }
  | {
      status: 'none';
    }
  | {
      status: 'self-serve';
    };

import { STRIPE_SUB_CACHE } from '@/app/api/stripe/stripeDataToKv.type';
import { PRICING_DEFAULTS } from '../constants/pricing';
import { SubscriptionType } from '../types/pricing';

export function calculatePriceFromStripe(
  stripePrice: { unitAmount: number | null } | null,
  defaultPrice: number,
): number {
  return stripePrice?.unitAmount ? Math.round(stripePrice.unitAmount / 100) : defaultPrice;
}

export function calculateMonthlyFromYearly(yearlyTotal: number): number {
  return Math.round(yearlyTotal / 12);
}

export function checkSubscriptionStatus(
  subscriptionType?: SubscriptionType,
  subscription?: STRIPE_SUB_CACHE,
) {
  const hasStarterSubscription = (() => {
    if (subscriptionType !== 'STARTER') return false;
    if (!subscription) return false;

    // Check if the subscription is completely dead
    if (subscription.status === 'incomplete_expired' || subscription.status === 'unpaid') {
      return false;
    }

    return true;
  })();

  const isSubscriptionCanceling =
    subscription && 'cancelAtPeriodEnd' in subscription && subscription.cancelAtPeriodEnd;

  const isLoadingSubscription = subscription === undefined;

  const hasPaymentIssue =
    subscription && 'status' in subscription && subscription.status === 'past_due';

  return {
    hasStarterSubscription,
    isSubscriptionCanceling,
    isLoadingSubscription,
    hasPaymentIssue,
  };
}

export function getPriceDetails(priceDetails: any) {
  return {
    starterMonthlyPrice: calculatePriceFromStripe(
      priceDetails.starterMonthlyPrice,
      PRICING_DEFAULTS.starter.monthly,
    ),
    starterYearlyPriceTotal: calculatePriceFromStripe(
      priceDetails.starterYearlyPrice,
      PRICING_DEFAULTS.starter.yearlyTotal,
    ),
    managedMonthlyPrice: calculatePriceFromStripe(
      priceDetails.managedMonthlyPrice,
      PRICING_DEFAULTS.managed.monthly,
    ),
    managedYearlyPriceTotal: calculatePriceFromStripe(
      priceDetails.managedYearlyPrice,
      PRICING_DEFAULTS.managed.yearlyTotal,
    ),
  };
}

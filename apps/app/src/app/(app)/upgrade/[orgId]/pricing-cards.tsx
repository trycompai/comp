'use client';

import { Alert, AlertDescription } from '@comp/ui/alert';
import { AlertCircle } from 'lucide-react';
import { PricingCard } from './components/pricing-card';
import { PRICING_FEATURES } from './constants/pricing';
import { useCheckout } from './hooks/use-checkout';
import { PricingCardsProps } from './types/pricing';
import { checkSubscriptionStatus, getPriceDetails } from './utils/pricing-helpers';

export function PricingCards({
  organizationId,
  priceDetails,
  currentSubscription,
  subscriptionType,
}: PricingCardsProps) {
  // Check subscription status
  const { hasStarterSubscription, isLoadingSubscription, hasPaymentIssue } =
    checkSubscriptionStatus(subscriptionType, currentSubscription);

  // Calculate prices
  const prices = getPriceDetails(priceDetails);

  // Use checkout hook
  const { handleSubscribe, executingButton } = useCheckout({
    organizationId,
    hasStarterSubscription,
    prices,
    priceDetails,
  });

  return (
    <div className="space-y-4">
      {/* Payment Issue Alert */}
      {hasPaymentIssue && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            Your current subscription has a payment issue. Please update your payment method in{' '}
            <a href={`/${organizationId}/settings/billing`} className="underline font-medium">
              billing settings
            </a>{' '}
            before upgrading to a new plan.
          </AlertDescription>
        </Alert>
      )}

      {/* Pricing Card */}
      <div className="flex justify-center w-full">
        <div className="max-w-md w-full">
          <PricingCard
            planType="managed"
            onCheckoutUpfront={() => handleSubscribe('managed', 'upfront')}
            onCheckoutMonthly={() => handleSubscribe('managed', 'monthly')}
            title="Done For You"
            description="For companies up to 25 people."
            annualPrice={prices.managedYearlyPriceTotal}
            monthlyPrice={prices.managedMonthlyPrice}
            subtitle="White-glove compliance service"
            features={PRICING_FEATURES.managed}
            isExecutingUpfront={executingButton === 'managed-upfront'}
            isExecutingMonthly={executingButton === 'managed-monthly'}
            isCurrentPlan={false}
            isLoadingSubscription={isLoadingSubscription}
          />
        </div>
      </div>
    </div>
  );
}

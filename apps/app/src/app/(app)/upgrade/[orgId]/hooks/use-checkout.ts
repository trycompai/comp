import { generateCheckoutSessionAction } from '@/app/api/stripe/generate-checkout-session/generate-checkout-session';
import { trackEvent, trackPurchaseEvent } from '@/utils/tracking';
import { SubscriptionType } from '@comp/db/types';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PLAN_TYPES } from '../constants/pricing';
import { PaymentType } from '../types/pricing';

interface UseCheckoutProps {
  organizationId: string;
  hasStarterSubscription: boolean;
  prices: {
    starterMonthlyPrice: number;
    starterYearlyPriceTotal: number;
    managedMonthlyPrice: number;
    managedYearlyPriceTotal: number;
  };
  priceDetails: any;
}

export function useCheckout({
  organizationId,
  hasStarterSubscription,
  prices,
  priceDetails,
}: UseCheckoutProps) {
  const router = useRouter();
  const [executingButton, setExecutingButton] = useState<string | null>(null);

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { execute, isExecuting } = useAction(generateCheckoutSessionAction, {
    onSuccess: ({ data }) => {
      if (data?.checkoutUrl) {
        router.push(data.checkoutUrl);
      }
      setExecutingButton(null);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to create checkout session');
      setExecutingButton(null);
    },
  });

  const handleSubscribe = (plan: SubscriptionType, paymentType: PaymentType) => {
    // Don't allow subscribing to starter if already on starter
    if (plan === 'STARTER' && hasStarterSubscription) {
      return;
    }

    // Set which button is executing
    setExecutingButton(`${plan}-${paymentType}`);

    const isYearly = paymentType === 'upfront';
    let priceId: string | undefined;
    let planType: string;

    if (plan === 'STARTER') {
      priceId = isYearly
        ? priceDetails.starterYearlyPrice?.id
        : priceDetails.starterMonthlyPrice?.id;
      planType = PLAN_TYPES.starter;
    } else {
      priceId = isYearly
        ? priceDetails.managedYearlyPrice?.id
        : priceDetails.managedMonthlyPrice?.id;
      planType = PLAN_TYPES.managed;
    }

    if (!priceId) {
      toast.error('Price information not available');
      setExecutingButton(null);
      return;
    }

    // Track checkout started event
    const value =
      plan === 'STARTER'
        ? isYearly
          ? prices.starterYearlyPriceTotal
          : prices.starterMonthlyPrice
        : isYearly
          ? prices.managedYearlyPriceTotal
          : prices.managedMonthlyPrice;

    trackPurchaseEvent('checkout_started', value);
    trackEvent('checkout_started', {
      event_category: 'ecommerce',
      event_label: `${plan}_${isYearly ? 'yearly' : 'monthly'}`,
      plan_type: plan,
      billing_period: isYearly ? 'yearly' : 'monthly',
      value,
      currency: 'USD',
    });

    execute({
      organizationId,
      mode: 'subscription',
      priceId,
      successUrl: `${baseUrl}/api/stripe/success?organizationId=${organizationId}&planType=${planType}`,
      cancelUrl: `${baseUrl}/upgrade/${organizationId}`,
      allowPromotionCodes: true,
      metadata: {
        organizationId,
        plan,
        billingPeriod: isYearly ? 'yearly' : 'monthly',
      },
    });
  };

  return {
    handleSubscribe,
    executingButton,
  };
}

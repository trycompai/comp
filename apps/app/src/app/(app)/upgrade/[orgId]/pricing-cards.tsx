'use client';

import { generateCheckoutSessionAction } from '@/app/api/stripe/generate-checkout-session/generate-checkout-session';
import { STRIPE_SUB_CACHE } from '@/app/api/stripe/stripeDataToKv.type';
import { trackEvent, trackPurchaseEvent } from '@/utils/tracking';
import { Alert, AlertDescription } from '@comp/ui/alert';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { AlertCircle, ArrowRight, CheckIcon, Loader2, Quote, Star } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { BookingDialog } from './components/BookingDialog';

interface PricingCardsProps {
  organizationId: string;
  priceDetails: {
    managedMonthlyPrice: {
      id: string;
      unitAmount: number | null;
      currency: string;
      interval: string | null;
      productName: string | null;
    } | null;
    managedYearlyPrice: {
      id: string;
      unitAmount: number | null;
      currency: string;
      interval: string | null;
      productName: string | null;
    } | null;
    starterMonthlyPrice: {
      id: string;
      unitAmount: number | null;
      currency: string;
      interval: string | null;
      productName: string | null;
    } | null;
    starterYearlyPrice: {
      id: string;
      unitAmount: number | null;
      currency: string;
      interval: string | null;
      productName: string | null;
    } | null;
  };
  currentSubscription?: STRIPE_SUB_CACHE;
  subscriptionType?: 'NONE' | 'FREE' | 'STARTER' | 'MANAGED';
}

interface PricingCardProps {
  planType: 'starter' | 'managed';
  onCheckout: () => void;
  title: string;
  description: string;
  price: number;
  priceLabel: string;
  subtitle?: string;
  features: string[];
  badge?: string;
  footerText?: string;
  yearlyPrice?: number;
  isYearly?: boolean;
  isExecuting?: boolean;
  buttonText?: string;
  isCurrentPlan?: boolean;
}

const PricingCard = ({
  planType,
  onCheckout,
  title,
  description,
  price,
  priceLabel,
  subtitle,
  features,
  badge,
  footerText,
  yearlyPrice,
  isYearly,
  isExecuting,
  buttonText,
  isCurrentPlan,
}: PricingCardProps) => {
  const isPopular = planType === 'managed';

  return (
    <Card
      className={`relative transition-all h-full flex flex-col border ${
        isPopular
          ? 'ring-2 ring-green-500 shadow-lg bg-green-50/30 dark:bg-green-950/20 border-green-500/50 scale-105 hover:shadow-xl'
          : isCurrentPlan
            ? 'opacity-75'
            : 'hover:shadow-md bg-card border-border'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-green-600 text-white dark:bg-green-500 dark:text-white px-3 py-1">
            MOST POPULAR
          </Badge>
        </div>
      )}
      <CardHeader className="p-6 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {badge && !isPopular && (
              <Badge
                className={
                  badge === '14-day trial'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs px-1.5 py-0'
                    : badge === 'Current Plan'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-1.5 py-0'
                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-1.5 py-0'
                }
              >
                {badge}
              </Badge>
            )}
          </div>
          <CardDescription className="text-sm mt-1">{description}</CardDescription>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">${price.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/{priceLabel}</span>
          </div>
          {isYearly && yearlyPrice && (
            <p className="text-sm text-muted-foreground mt-1">
              Billed as ${yearlyPrice.toLocaleString()} yearly
            </p>
          )}
          {subtitle && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">{subtitle}</p>
          )}
        </div>
      </CardHeader>

      <div className={`border-t ${isPopular ? 'border-green-500/30' : 'border-border'} mx-6`} />

      <CardContent className="px-6 flex flex-col h-full">
        <ul className="space-y-2 flex-1 py-3">
          {features.map((feature, idx) => {
            const isEverythingIn = idx === 0 && feature.includes('Everything in');
            const isAuditNote = feature.includes('Pay for your audit');

            return (
              <li
                key={feature}
                className={
                  isEverythingIn
                    ? 'pb-1'
                    : isAuditNote
                      ? 'mt-2 pt-2 border-t border-border'
                      : 'flex items-start gap-2'
                }
              >
                {!isEverythingIn && !isAuditNote && (
                  <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                )}
                <span
                  className={`text-sm leading-relaxed ${
                    isEverythingIn
                      ? 'font-semibold text-muted-foreground block'
                      : isAuditNote
                        ? 'text-muted-foreground italic'
                        : ''
                  }`}
                >
                  {feature}
                </span>
              </li>
            );
          })}
        </ul>
        <div className={`border-t ${isPopular ? 'border-green-500/30' : 'border-border'}`}>
          <p className="text-xs text-center text-muted-foreground">{footerText}</p>
        </div>
      </CardContent>

      <CardFooter className="px-6 pt-0 pb-6">
        <Button
          onClick={onCheckout}
          className="w-full"
          variant={isPopular ? 'default' : 'outline'}
          size={isPopular ? 'lg' : 'default'}
          disabled={isExecuting || isCurrentPlan}
        >
          {isExecuting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {buttonText || 'Go to Checkout'}
              {!isCurrentPlan && (
                <ArrowRight className={`ml-2 ${isPopular ? 'h-5 w-5' : 'h-4 w-4'}`} />
              )}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

const starterFeatures = [
  'Access to all frameworks',
  'Trust & Security Portal',
  'AI Vendor Management',
  'AI Risk Management',
  'Unlimited team members',
  'API access',
  'Community Support',
];

const managedFeatures = [
  'Everything in Starter plus:',
  'SOC 2 or ISO 27001 Done For You',
  '3rd Party Audit Included',
  'Compliant in 14 Days or Less',
  '14 Day Money Back Guarantee',
  'Dedicated Success Team',
  '24x7x365 Support & SLA',
  'Slack Channel with Comp AI',
  '12-month minimum term',
];

export function PricingCards({
  organizationId,
  priceDetails,
  currentSubscription,
  subscriptionType,
}: PricingCardsProps) {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(true);

  // Check if user has an active starter subscription
  const hasStarterSubscription = (() => {
    // If we have the subscription type from the database, use that
    if (subscriptionType === 'STARTER') {
      // Also check if the subscription is still valid
      if (!currentSubscription) return false;

      // Check if the subscription is completely dead
      if (
        currentSubscription.status === 'incomplete_expired' ||
        currentSubscription.status === 'unpaid'
      ) {
        return false;
      }

      return true;
    }

    return false;
  })();

  // Check if subscription is in a canceling state
  const isSubscriptionCanceling =
    currentSubscription &&
    'cancelAtPeriodEnd' in currentSubscription &&
    currentSubscription.cancelAtPeriodEnd;

  // Check if we're still loading subscription data
  const isLoadingSubscription = currentSubscription === undefined;

  // Check if subscription has payment issues
  const hasPaymentIssue =
    currentSubscription &&
    'status' in currentSubscription &&
    currentSubscription.status === 'past_due';

  const { execute, isExecuting } = useAction(generateCheckoutSessionAction, {
    onSuccess: ({ data }) => {
      if (data?.checkoutUrl) {
        router.push(data.checkoutUrl);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to create checkout session');
    },
  });

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const handleSubscribe = (plan: 'starter' | 'managed') => {
    // Don't allow subscribing to starter if already on starter
    if (plan === 'starter' && hasStarterSubscription) {
      return;
    }

    let priceId: string | undefined;
    let planType: string;
    let trialPeriodDays: number | undefined;

    if (plan === 'starter') {
      // Use starter prices with 14-day trial
      priceId = isYearly
        ? priceDetails.starterYearlyPrice?.id
        : priceDetails.starterMonthlyPrice?.id;
      planType = 'starter';
      trialPeriodDays = 14;
    } else {
      // Use managed (Done For You) prices
      priceId = isYearly
        ? priceDetails.managedYearlyPrice?.id
        : priceDetails.managedMonthlyPrice?.id;
      planType = 'done-for-you';
      trialPeriodDays = undefined;
    }

    if (!priceId) {
      toast.error('Price information not available');
      return;
    }

    // Track checkout started event
    const value =
      plan === 'starter'
        ? isYearly
          ? starterYearlyPriceTotal
          : starterMonthlyPrice
        : isYearly
          ? managedYearlyPriceTotal
          : managedMonthlyPrice;

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
      trialPeriodDays,
      metadata: {
        organizationId,
        plan,
        billingPeriod: isYearly ? 'yearly' : 'monthly',
      },
    });
  };

  // Calculate prices from Stripe data
  const starterMonthlyPrice = priceDetails.starterMonthlyPrice?.unitAmount
    ? Math.round(priceDetails.starterMonthlyPrice.unitAmount / 100)
    : 99; // fallback to $99

  const starterYearlyPriceTotal = priceDetails.starterYearlyPrice?.unitAmount
    ? Math.round(priceDetails.starterYearlyPrice.unitAmount / 100)
    : 948; // fallback with 20% discount (99 * 12 * 0.8)

  const managedMonthlyPrice = priceDetails.managedMonthlyPrice?.unitAmount
    ? Math.round(priceDetails.managedMonthlyPrice.unitAmount / 100)
    : 997; // fallback to $997

  const managedYearlyPriceTotal = priceDetails.managedYearlyPrice?.unitAmount
    ? Math.round(priceDetails.managedYearlyPrice.unitAmount / 100)
    : 9564; // fallback with 20% discount (997 * 12 * 0.8)

  // Calculate monthly equivalent for yearly pricing display
  const starterYearlyPriceMonthly = Math.round(starterYearlyPriceTotal / 12);
  const managedYearlyPriceMonthly = Math.round(managedYearlyPriceTotal / 12);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
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

      {/* Pricing Toggle */}
      <div className="flex flex-col items-center gap-2">
        <div className="bg-muted/50 p-1 rounded-lg flex items-center justify-center gap-1">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-4 py-2 text-sm rounded-md transition-all ${
              !isYearly
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${
              isYearly
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yearly
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-1.5 py-0">
              Save 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Plan Selection */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6 mt-6">
          <PricingCard
            planType="starter"
            onCheckout={() => handleSubscribe('starter')}
            title="Starter"
            description="Everything you need to get compliant, fast."
            price={isYearly ? starterYearlyPriceMonthly : starterMonthlyPrice}
            priceLabel="month"
            subtitle="DIY (Do It Yourself) Compliance"
            features={starterFeatures}
            badge={
              hasStarterSubscription
                ? isSubscriptionCanceling
                  ? 'Canceling'
                  : 'Current Plan'
                : '14-day trial'
            }
            yearlyPrice={isYearly ? starterYearlyPriceTotal : undefined}
            isYearly={isYearly}
            isExecuting={(isExecuting && !hasStarterSubscription) || isLoadingSubscription}
            buttonText={
              isLoadingSubscription
                ? 'Loading...'
                : hasStarterSubscription
                  ? isSubscriptionCanceling
                    ? 'Plan Canceling'
                    : 'Your Current Plan'
                  : 'Start 14-Day Free Trial'
            }
            isCurrentPlan={hasStarterSubscription}
          />

          <PricingCard
            planType="managed"
            onCheckout={() => handleSubscribe('managed')}
            title="Done For You"
            description="For companies up to 25 people."
            price={isYearly ? managedYearlyPriceMonthly : managedMonthlyPrice}
            priceLabel="month"
            subtitle="White-glove compliance service"
            features={managedFeatures}
            badge="Popular"
            yearlyPrice={isYearly ? managedYearlyPriceTotal : undefined}
            isYearly={isYearly}
            isExecuting={isExecuting || isLoadingSubscription}
            buttonText={
              isLoadingSubscription
                ? 'Loading...'
                : hasStarterSubscription
                  ? isSubscriptionCanceling
                    ? 'Upgrade Instead of Canceling'
                    : 'Upgrade to Done For You'
                  : 'Continue'
            }
            isCurrentPlan={false}
          />
        </div>

        {/* Testimonial/Trust Column */}
        <div className="space-y-6 mt-6">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Quote className="h-4 w-4 text-green-600 dark:text-green-500" />
                  Customer Review
                </CardTitle>
                <a
                  href="https://www.g2.com/products/comp-ai/reviews/comp-ai-review-11318067"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1000 1000"
                    className="h-5 w-5 fill-current"
                    aria-label="G2"
                  >
                    <circle
                      cx="500"
                      cy="500"
                      r="500"
                      className="fill-orange-500 dark:fill-orange-400"
                    ></circle>
                    <path
                      d="M716.4 383H631c2.3-13.4 10.6-20.9 27.4-29.4l15.7-8c28.1-14.4 43.1-30.7 43.1-57.3 0-16.7-6.5-29.9-19.4-39.4s-28.1-14.2-45.9-14.2a70.8 70.8 0 00-38.9 11.1c-11.7 7.2-20.4 16.5-25.8 28.1l24.7 24.8c9.6-19.4 23.5-28.9 41.8-28.9 15.5 0 25 8 25 19.1 0 9.3-4.6 17-22.4 26l-10.1 4.9c-21.9 11.1-37.1 23.8-45.9 38.2s-13.1 32.5-13.1 54.4v6h129.2zM705 459.2H563.6l-70.7 122.4h141.4L705 704.1l70.7-122.5L705 459.2z"
                      className="fill-white"
                    ></path>
                    <path
                      d="M505.1 663.3c-90 0-163.3-73.3-163.3-163.3s73.3-163.3 163.3-163.3L561 219.8a286.4 286.4 0 00-55.9-5.5c-157.8 0-285.7 127.9-285.7 285.7s127.9 285.7 285.7 285.7a283.9 283.9 0 00168.2-54.8l-61.8-107.2a162.8 162.8 0 01-106.4 39.6z"
                      className="fill-white"
                    ></path>
                  </svg>
                  <span className="group-hover:underline">Verified Review</span>
                </a>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                  <span className="text-sm font-medium ml-1">5.0</span>
                </div>
                <a
                  href="https://www.g2.com/products/comp-ai/reviews"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                >
                  from 100+ reviews
                </a>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-sm leading-relaxed mb-4">
                "Comp AI helped us get audit ready for SOC 2 Type 2 in only 2 weeks. When talking to
                one of their competitors, they wanted us to go with 3 different services - platform,
                technical support, and auditors. With Comp, we paid the equivalent to only the
                platform fee and got all 3! The team was incredibly responsive and made the process
                easier than expected."
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="/testimonials/jeffrey_l.jpeg"
                    alt="Jeffrey L."
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium">Jeffrey L.</p>
                    <p className="text-xs text-muted-foreground">CEO, OpenRep</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  June 2025
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground text-center mb-3">
                Have questions? We're here to help
              </p>
              <BookingDialog />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

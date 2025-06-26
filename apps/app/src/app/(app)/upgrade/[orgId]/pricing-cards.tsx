'use client';

import { generateCheckoutSessionAction } from '@/app/api/stripe/generate-checkout-session/generate-checkout-session';
import { ReviewSection } from '@/components/ReviewSection';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { CheckIcon, Loader2 } from 'lucide-react';
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
}

interface PricingCardProps {
  planType: 'starter' | 'managed';
  onClick: () => void;
  title: string;
  description: string;
  price: number;
  priceLabel: string;
  subtitle?: string;
  features: string[];
  badge?: string;
  footerText: string;
  yearlyPrice?: number;
  isYearly?: boolean;
  isExecuting?: boolean;
}

const PricingCard = ({
  planType,
  onClick,
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
}: PricingCardProps) => {
  const isManaged = planType === 'managed';

  return (
    <Card
      className={`relative transition-all h-full flex flex-col ${
        isManaged
          ? 'ring-2 ring-green-500 shadow-lg bg-green-50/50 dark:bg-green-950/20 backdrop-blur-lg border-green-500/20'
          : 'hover:shadow-md bg-card border-border'
      } border`}
    >
      <CardHeader className="p-6 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {badge && (
              <Badge
                className={
                  badge === '14-day trial'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs px-1.5 py-0'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-1.5 py-0'
                }
              >
                {badge}
              </Badge>
            )}
          </div>
          <CardDescription className="text-sm mt-0.5">{description}</CardDescription>
        </div>
        <div className="mt-4">
          {isYearly && yearlyPrice ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">${price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/{priceLabel}</span>
              </div>
              <div className="space-y-1 mt-1">
                <p className="text-sm text-muted-foreground">
                  Billed as a single yearly payment of ${yearlyPrice.toLocaleString()}
                </p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Save 20% vs monthly billing
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">${price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/{priceLabel}</span>
              </div>
              {subtitle && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">{subtitle}</p>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <div className={`border-t ${isManaged ? 'border-green-500/30' : 'border-border'} mx-6`} />

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
        <div
          className={`border-t ${
            isManaged ? 'border-green-500/30' : 'border-border'
          } mt-auto pt-4 pb-4`}
        >
          <Button
            onClick={onClick}
            disabled={isExecuting}
            size="default"
            variant={isManaged ? 'default' : 'outline'}
            className={`w-full ${isManaged ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : planType === 'starter' ? (
              'Start 14-Day Free Trial'
            ) : isYearly ? (
              'Get Started - Annual'
            ) : (
              'Get Started - Monthly'
            )}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground pb-4">{footerText}</p>
      </CardContent>
    </Card>
  );
};

const starterFeatures = [
  '14-day free trial',
  'Access to all frameworks',
  'Trust & Security Portal',
  'AI Vendor Management',
  'AI Risk Management',
  'Unlimited team members',
  'API access',
  'Community Support',
  'Pay for your audit or bring your own 3rd party auditor when ready',
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

export function PricingCards({ organizationId, priceDetails }: PricingCardsProps) {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<'starter' | 'managed' | null>(null);

  const { execute, isExecuting } = useAction(generateCheckoutSessionAction, {
    onSuccess: ({ data }) => {
      if (data?.checkoutUrl) {
        router.push(data.checkoutUrl);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to create checkout session');
      setProcessingPlan(null);
    },
  });

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const handleSubscribe = (selectedPlan: 'starter' | 'managed') => {
    setProcessingPlan(selectedPlan);
    let priceId: string | undefined;
    let planType: string;
    let trialPeriodDays: number | undefined;

    if (selectedPlan === 'starter') {
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
      setProcessingPlan(null);
      return;
    }

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
        plan: selectedPlan,
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

  const currentMonthlyPrice = starterMonthlyPrice;
  const currentYearlyTotal = starterYearlyPriceTotal;
  const yearlySavings = currentMonthlyPrice * 12 - currentYearlyTotal;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
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
        <p className="text-xs text-muted-foreground text-center">
          {isYearly
            ? `Save $${yearlySavings.toLocaleString()} per year with annual billing`
            : `Switch to yearly billing to save $${yearlySavings.toLocaleString()} per year`}
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <PricingCard
          planType="starter"
          onClick={() => handleSubscribe('starter')}
          title="Starter"
          description="Everything you need to get compliant, fast."
          price={isYearly ? starterYearlyPriceMonthly : starterMonthlyPrice}
          priceLabel="month"
          subtitle={isYearly ? undefined : 'DIY (Do It Yourself) Compliance'}
          features={starterFeatures}
          footerText="DIY Compliance Solution"
          yearlyPrice={isYearly ? starterYearlyPriceTotal : undefined}
          isYearly={isYearly}
          badge="14-day trial"
          isExecuting={isExecuting && processingPlan === 'starter'}
        />

        <PricingCard
          planType="managed"
          onClick={() => handleSubscribe('managed')}
          title="Done For You"
          description="For companies up to 25 people."
          price={isYearly ? managedYearlyPriceMonthly : managedMonthlyPrice}
          priceLabel="month"
          subtitle={isYearly ? undefined : 'White-glove compliance service'}
          features={managedFeatures}
          badge="Popular"
          footerText="Done-for-you compliance"
          yearlyPrice={isYearly ? managedYearlyPriceTotal : undefined}
          isYearly={isYearly}
          isExecuting={isExecuting && processingPlan === 'managed'}
        />
      </div>

      {/* Bottom Section with Review and Help */}
      <div className="grid md:grid-cols-2 gap-6 pt-4">
        {/* Review Section */}
        <div className="flex items-center justify-center">
          <Card className="bg-muted/30 border-dashed w-full">
            <CardContent className="p-6 text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Trusted by compliance teams
              </h3>
              <ReviewSection rating={4.7} reviewCount={100} />
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <div className="flex items-center justify-center">
          <Card className="bg-muted/30 border-dashed w-full">
            <CardContent className="p-6 text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Need help choosing?
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Talk to our compliance experts</p>
              <div className="flex justify-center">
                <BookingDialog />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Info */}
      <div className="text-center text-xs text-muted-foreground space-y-1 pt-4">
        <p>All plans include a 14-day money-back guarantee</p>
        <p>Prices shown in USD • Cancel anytime</p>
      </div>
    </div>
  );
}

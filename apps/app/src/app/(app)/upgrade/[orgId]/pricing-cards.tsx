'use client';

import { chooseSelfServeAction } from '@/actions/organization/choose-self-serve';
import { generateCheckoutSessionAction } from '@/app/api/stripe/generate-checkout-session/generate-checkout-session';
import { SelectionIndicator } from '@/components/layout/SelectionIndicator';
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
import { CheckIcon, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface PricingCardsProps {
  organizationId: string;
  priceDetails: {
    monthlyPrice: {
      id: string;
      unitAmount: number | null;
      currency: string;
      interval: string | null;
      productName: string | null;
    } | null;
    yearlyPrice: {
      id: string;
      unitAmount: number | null;
      currency: string;
      interval: string | null;
      productName: string | null;
    } | null;
  };
}

interface PricingCardProps {
  planType: 'free' | 'paid';
  isSelected: boolean;
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
}

const PricingCard = ({
  planType,
  isSelected,
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
}: PricingCardProps) => {
  return (
    <Card
      className={`relative cursor-pointer transition-all h-full flex flex-col ${
        isSelected
          ? 'ring-2 ring-green-500 shadow-lg bg-green-50/50 dark:bg-primary/15 backdrop-blur-lg'
          : 'hover:shadow-md bg-card'
      } border border-border`}
      onClick={onClick}
    >
      <CardHeader className="p-6 pb-4">
        <div className="flex items-start gap-3">
          <SelectionIndicator isSelected={isSelected} variant="radio" />
          <div className="flex-1 -mt-0.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              {badge && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-1.5 py-0">
                  {badge}
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm mt-0.5">{description}</CardDescription>
          </div>
        </div>
        <div className="mt-4">
          {isYearly && yearlyPrice ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">${yearlyPrice.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/year</span>
              </div>
              <div className="space-y-1 mt-1">
                <p className="text-sm text-muted-foreground">
                  ${price.toLocaleString()}/mo when paid annually
                </p>
                {planType === 'paid' && (
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Save 20% vs monthly billing
                  </p>
                )}
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

      <div className={`border-t ${isSelected ? 'border-green-500/30' : 'border-border'} mx-6`} />

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
            isSelected ? 'border-green-500/30' : 'border-border'
          } mt-auto pt-4`}
        >
          <p className="text-xs text-center text-muted-foreground">{footerText}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const freeFeatures = [
  'Access to all frameworks',
  'Trust & Security Portal',
  'AI Vendor Management',
  'AI Risk Management',
  'Unlimited team members',
  'API access',
  'Community Support',
  'Pay for your audit or bring your own 3rd party auditor when ready',
];

const paidFeatures = [
  'Everything in Starter plus:',
  'SOC 2 or ISO 27001 Done For You',
  '3rd Party Audit Included',
  'Compliant in 14 Days or Less',
  '14 Day Money Back Guarantee',
  'Dedicated Success Team',
  '24x7x365 Support & SLA',
  'Slack Channel with Comp AI',
];

export function PricingCards({ organizationId, priceDetails }: PricingCardsProps) {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'paid'>('paid');

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

  const { execute: executeChooseSelfServe, isExecuting: isChoosingFree } = useAction(
    chooseSelfServeAction,
    {
      onSuccess: () => {
        router.push(`/${organizationId}`);
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to set up free plan');
      },
    },
  );

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const handleSubscribe = () => {
    if (selectedPlan === 'free') {
      // For free plan, update the database and redirect
      executeChooseSelfServe({ organizationId });
      return;
    }

    // Determine which price ID to use based on yearly/monthly selection
    const priceId = isYearly ? priceDetails.yearlyPrice?.id : priceDetails.monthlyPrice?.id;

    if (!priceId) {
      toast.error('Price information not available');
      return;
    }

    execute({
      organizationId,
      mode: 'subscription',
      priceId,
      successUrl: `${baseUrl}/${organizationId}/settings/billing?success=true`,
      cancelUrl: `${baseUrl}/upgrade/${organizationId}`,
      allowPromotionCodes: true,
      metadata: {
        organizationId,
        plan: 'paid',
        billingPeriod: isYearly ? 'yearly' : 'monthly',
      },
    });
  };

  // Calculate prices from Stripe data
  const monthlyPrice = priceDetails.monthlyPrice?.unitAmount
    ? Math.round(priceDetails.monthlyPrice.unitAmount / 100)
    : 997; // fallback to $997

  // Yearly price from Stripe is the total yearly amount
  const yearlyPriceTotal = priceDetails.yearlyPrice?.unitAmount
    ? Math.round(priceDetails.yearlyPrice.unitAmount / 100)
    : 9564; // fallback with 20% discount (997 * 12 * 0.8)

  // Calculate monthly equivalent for yearly pricing display
  const yearlyPriceMonthly = Math.round(yearlyPriceTotal / 12);

  const currentPrice = selectedPlan === 'free' ? 0 : isYearly ? yearlyPriceMonthly : monthlyPrice;
  const yearlySavings = monthlyPrice * 12 - yearlyPriceTotal;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
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
          {selectedPlan === 'paid'
            ? isYearly
              ? `Pay $${yearlyPriceTotal.toLocaleString()} once • Save $${yearlySavings.toLocaleString()} per year`
              : `Switch to yearly billing to save $${yearlySavings.toLocaleString()} per year`
            : 'Start free • No credit card required'}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Plan Selection */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-3">
          <PricingCard
            planType="free"
            isSelected={selectedPlan === 'free'}
            onClick={() => setSelectedPlan('free')}
            title="Starter"
            description="Everything you need to get compliant, fast."
            price={0}
            priceLabel="month"
            subtitle="DIY (Do It Yourself) Compliance"
            features={freeFeatures}
            footerText="DIY Compliance Solution"
          />

          <PricingCard
            planType="paid"
            isSelected={selectedPlan === 'paid'}
            onClick={() => setSelectedPlan('paid')}
            title="Done For You"
            description="For companies up to 25 people."
            price={isYearly ? yearlyPriceMonthly : monthlyPrice}
            priceLabel="month"
            subtitle={undefined}
            features={paidFeatures}
            badge="Popular"
            footerText="Done-for-you compliance"
            yearlyPrice={isYearly ? yearlyPriceTotal : undefined}
            isYearly={isYearly && selectedPlan === 'paid'}
          />
        </div>

        {/* Right Column - Checkout */}
        <div className="space-y-3">
          {/* Checkout Summary */}
          <Card className="bg-card/90 dark:bg-card/80 backdrop-blur-lg border-2 border-white/20 dark:border-white/10 shadow-xl">
            <CardHeader className="pb-3 pt-4 bg-muted/50 dark:bg-muted/40 backdrop-blur-sm rounded-t-lg">
              <CardTitle className="text-lg font-semibold text-center">Checkout</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {selectedPlan === 'free' ? 'Starter' : 'Done For You'} Plan
                  </span>
                  {selectedPlan === 'paid' && isYearly ? (
                    <span className="text-sm font-semibold">
                      ${yearlyPriceTotal.toLocaleString()}/year
                    </span>
                  ) : (
                    <span className="text-sm font-semibold">
                      ${currentPrice.toLocaleString()}/month
                    </span>
                  )}
                </div>
                {selectedPlan === 'paid' && isYearly && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Billing period</span>
                      <span className="text-sm text-muted-foreground">12 months</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Monthly equivalent</span>
                      <span className="text-sm text-muted-foreground">
                        ${yearlyPriceMonthly.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                      <span className="text-sm font-medium">You save</span>
                      <span className="text-sm font-medium">
                        ${yearlySavings.toLocaleString()} (20%)
                      </span>
                    </div>
                  </>
                )}
                <div className="border-t-2 pt-3 mt-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-semibold">Due today</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold">
                        $
                        {selectedPlan === 'free'
                          ? 0
                          : isYearly
                            ? yearlyPriceTotal.toLocaleString()
                            : currentPrice.toLocaleString()}
                      </span>
                      {selectedPlan === 'paid' && !isYearly && (
                        <span className="text-sm text-muted-foreground block">
                          then ${currentPrice.toLocaleString()}/month
                        </span>
                      )}
                      {selectedPlan === 'paid' && isYearly && (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400 block">
                          One-time payment
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-3 flex flex-col gap-3">
              <Button
                onClick={handleSubscribe}
                disabled={isExecuting || isChoosingFree}
                size="default"
                className="w-full"
              >
                {isExecuting || isChoosingFree ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : selectedPlan === 'free' ? (
                  'Start Free'
                ) : isYearly ? (
                  'Start Annual Plan'
                ) : (
                  'Start Monthly Plan'
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Trust Signals */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground px-2">
              SSL encrypted • SOC 2 certified • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

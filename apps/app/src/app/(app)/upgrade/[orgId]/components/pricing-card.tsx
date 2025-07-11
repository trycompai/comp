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
import { ArrowRight, CheckIcon, Loader2 } from 'lucide-react';
import { PricingCardProps } from '../types/pricing';

export const PricingCard = ({
  planType,
  onCheckoutUpfront,
  onCheckoutMonthly,
  title,
  description,
  annualPrice,
  monthlyPrice,
  subtitle,
  features,
  badge,
  isExecutingUpfront,
  isExecutingMonthly,
  isCurrentPlan,
  isLoadingSubscription,
}: PricingCardProps) => {
  const isPopular = planType === 'managed';

  return (
    <Card
      className={`relative transition-all h-full flex flex-col border w-full shadow-lg ${
        isCurrentPlan
          ? 'opacity-75'
          : 'hover:border-gray-300 dark:hover:border-gray-600 bg-card border-border'
      }`}
    >
      <CardHeader className="p-6 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {badge && !isPopular && (
              <Badge
                className={
                  badge === 'Current Plan'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-1.5 py-0'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs px-1.5 py-0'
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
            <span className="text-3xl font-bold">${annualPrice.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/year</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            or 12 payments of ${monthlyPrice.toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">{subtitle}</p>
          )}
        </div>
      </CardHeader>

      <div className="border-t border-border mx-6" />

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
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
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

        {/* Money Back Guarantee Section */}
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-md border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                14-Day Money Back Guarantee
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Try risk-free. Full refund if not satisfied.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 pt-0 pb-6">
        {isCurrentPlan ? (
          <Button className="w-full" variant="outline" disabled>
            Your Current Plan
          </Button>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={onCheckoutUpfront}
              className="w-full"
              variant="default"
              size="lg"
              disabled={isExecutingUpfront || isExecutingMonthly || isLoadingSubscription}
            >
              {isExecutingUpfront ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Pay in Full
                  <span className="ml-1.5 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full">
                    Save 20%
                  </span>
                  <ArrowRight className="ml-1.5 h-5 w-5" />
                </>
              )}
            </Button>
            <Button
              onClick={onCheckoutMonthly}
              className="w-full text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              variant="link"
              size="sm"
              disabled={isExecutingMonthly || isExecutingUpfront || isLoadingSubscription}
            >
              {isExecutingMonthly ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  or pay in 12 installments
                  <ArrowRight className="ml-1 h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

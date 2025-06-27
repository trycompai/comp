'use client';

import { cancelSubscriptionAction } from '@/app/api/stripe/cancel-subscription/cancel-subscription';
import { createPortalSessionAction } from '@/app/api/stripe/create-portal-session/create-portal-session';
import { resumeSubscriptionAction } from '@/app/api/stripe/resume-subscription/resume-subscription';
import { useSubscription } from '@/context/subscription-context';
import { env } from '@/env.mjs';
import { Alert, AlertDescription } from '@comp/ui/alert';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Separator } from '@comp/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { CancelSubscriptionDialog } from './cancel-subscription-dialog';

type PlanType = 'free' | 'starter' | 'managed';

export default function BillingPage() {
  const { subscription, hasActiveSubscription, isTrialing, isSelfServe } = useSubscription();
  const router = useRouter();
  const params = useParams();
  const organizationId = params.orgId as string;
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Determine plan type based on price ID
  const getPlanType = (): PlanType => {
    if (isSelfServe) return 'free';
    if ('priceId' in subscription && subscription.priceId) {
      const starterPriceIds = [
        env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_STARTER_MONTHLY_PRICE_ID,
        env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_STARTER_YEARLY_PRICE_ID,
      ].filter(Boolean);

      if (starterPriceIds.includes(subscription.priceId)) {
        return 'starter';
      }
    }
    return 'managed';
  };

  const planType = getPlanType();

  // Get plan configuration
  const planConfig = {
    free: {
      displayName: 'Free Plan',
      description: 'DIY compliance for small teams',
      features: [
        'Complete access to manage your compliance program',
        'Generate policies and documentation',
        'Basic integrations',
        'Community support',
      ],
    },
    starter: {
      displayName: 'Starter Plan',
      description: 'Everything you need to get compliant',
      features: [
        'All frameworks (SOC 2, ISO 27001, etc.)',
        'Trust & Security Portal',
        'AI Vendor & Risk Management',
        'Unlimited team members',
        'API access',
        'Community Support',
      ],
      trialDays: 14,
      minimumTermMonths: 12,
    },
    managed: {
      displayName: 'Done For You',
      description: 'White-glove compliance service',
      features: [
        'Everything in Starter',
        'Dedicated compliance team',
        '3rd party audit included',
        'Compliant in 14 days',
        '24x7x365 Support & SLA',
        'Private Slack channel',
      ],
      minimumTermMonths: 12,
    },
  };

  const currentPlanConfig = planConfig[planType];

  // Calculate if minimum term has been met for both starter and managed plans
  const hasMetMinimumTerm = () => {
    // Free trials can be cancelled anytime
    if (isTrialing) {
      return true;
    }

    // Only enforce minimum term for starter and managed plans
    if (
      (planType !== 'starter' && planType !== 'managed') ||
      !('currentPeriodStart' in subscription) ||
      subscription.currentPeriodStart == null
    ) {
      return true;
    }

    const startDate = new Date(subscription.currentPeriodStart * 1000);
    const now = new Date();
    const monthsElapsed =
      (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());

    const minimumTermMonths =
      planType === 'starter'
        ? planConfig.starter.minimumTermMonths
        : planConfig.managed.minimumTermMonths;

    return monthsElapsed >= (minimumTermMonths || 12);
  };

  const canCancelSubscription = hasMetMinimumTerm();

  // Calculate when cancellation will be available
  const getCancellationAvailableDate = () => {
    // Free trials don't have minimum term
    if (isTrialing) {
      return null;
    }

    if (
      (planType !== 'starter' && planType !== 'managed') ||
      !('currentPeriodStart' in subscription) ||
      subscription.currentPeriodStart == null
    ) {
      return null;
    }

    const startDate = new Date(subscription.currentPeriodStart * 1000);
    const cancellationDate = new Date(startDate);
    const minimumTermMonths =
      planType === 'starter'
        ? planConfig.starter.minimumTermMonths
        : planConfig.managed.minimumTermMonths;

    cancellationDate.setMonth(cancellationDate.getMonth() + (minimumTermMonths || 12));

    return cancellationDate;
  };

  const formatDate = (timestamp: number | Date) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : timestamp;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Action for canceling subscription
  const { execute: cancelSubscription, isExecuting: isCanceling } = useAction(
    cancelSubscriptionAction,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success(data.message);
          setShowCancelDialog(false);
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to cancel subscription');
      },
    },
  );

  // Action for resuming subscription
  const { execute: resumeSubscription, isExecuting: isResuming } = useAction(
    resumeSubscriptionAction,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success(data.message);
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to resume subscription');
      },
    },
  );

  // Action for opening customer portal
  const { execute: openPortal, isExecuting: isOpeningPortal } = useAction(
    createPortalSessionAction,
    {
      onSuccess: ({ data }) => {
        if (data?.portalUrl) {
          router.push(data.portalUrl);
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to open billing portal');
      },
    },
  );

  const getStatusBadge = () => {
    if (subscription.status === 'none') {
      return <Badge variant="secondary">No subscription</Badge>;
    }

    if (subscription.status === 'self-serve') {
      return <Badge variant="secondary">Free Plan</Badge>;
    }

    const statusConfig = {
      active: { variant: 'default' as const, label: 'Active' },
      trialing: { variant: 'outline' as const, label: 'Trial' },
      past_due: { variant: 'destructive' as const, label: 'Past Due' },
      canceled: { variant: 'secondary' as const, label: 'Canceled' },
      incomplete: { variant: 'secondary' as const, label: 'Incomplete' },
      incomplete_expired: { variant: 'secondary' as const, label: 'Expired' },
      unpaid: { variant: 'destructive' as const, label: 'Unpaid' },
      paused: { variant: 'secondary' as const, label: 'Paused' },
    };

    const config = statusConfig[subscription.status] || {
      variant: 'secondary' as const,
      label: subscription.status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Function to refresh subscription data
  const refreshSubscriptionData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/stripe/sync-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      if (response.ok) {
        toast.success('Subscription data refreshed');
        // Reload the page to get updated data
        router.refresh();
      } else {
        toast.error('Failed to refresh subscription data');
      }
    } catch (error) {
      toast.error('Error refreshing subscription data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Render different states based on plan and subscription status

  // 1. Free Plan View
  if (planType === 'free') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{currentPlanConfig.displayName}</CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription>{currentPlanConfig.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Your plan includes:</p>
              <ul className="space-y-2">
                {currentPlanConfig.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Want more features?</p>
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  Upgrade to Starter or Done For You plans for advanced features and support.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => router.push(`/upgrade/${organizationId}`)}
                className="w-full sm:w-auto"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                View Upgrade Options
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. No Active Subscription View
  if (!hasActiveSubscription && subscription.status !== 'canceled') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>Choose a plan to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Choose a plan to start managing your compliance program.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push(`/upgrade/${organizationId}`)}
              className="w-full sm:w-auto"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Browse Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Active Subscription View (Starter or Managed)
  const renderTrialWarning = () => {
    if (
      !isTrialing ||
      !('currentPeriodEnd' in subscription) ||
      subscription.currentPeriodEnd == null
    )
      return null;

    const daysLeft = Math.ceil(
      (subscription.currentPeriodEnd * 1000 - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const trialEndDate = formatDate(subscription.currentPeriodEnd);

    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p>
              Your {currentPlanConfig.displayName} trial expires in {daysLeft} days ({trialEndDate}
              ).
            </p>
            {planType === 'starter' && (
              <p className="text-sm">
                Add a payment method now to continue after your trial. You won't be charged until
                the trial ends. Note: This plan requires a 12-month minimum commitment.
              </p>
            )}
            {planType === 'managed' && (
              <p className="text-sm">
                Your compliance team is ready to help! Note: This plan requires a 12-month minimum
                commitment.
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  const renderCancellationWarning = () => {
    if (!('cancelAtPeriodEnd' in subscription) || !subscription.cancelAtPeriodEnd) return null;

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your subscription will be canceled at the end of the current billing period.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {renderTrialWarning()}
        {renderCancellationWarning()}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>{currentPlanConfig.displayName}</CardTitle>
                {getStatusBadge()}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshSubscriptionData}
                disabled={isRefreshing}
                title="Refresh subscription data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription>{currentPlanConfig.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {'price' in subscription && subscription.price && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Billing</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {subscription.price.unit_amount
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: subscription.price.currency,
                        }).format(subscription.price.unit_amount / 100)
                      : 'Free'}
                    {subscription.price.interval ? `/${subscription.price.interval}` : ''}
                  </span>
                </div>
              )}

              {isTrialing &&
                'currentPeriodEnd' in subscription &&
                subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Trial Ends</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                )}

              {!isTrialing &&
                'currentPeriodStart' in subscription &&
                subscription.currentPeriodStart && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Started</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(subscription.currentPeriodStart)}
                    </span>
                  </div>
                )}

              {'currentPeriodEnd' in subscription &&
                subscription.currentPeriodEnd &&
                !isTrialing && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {'cancelAtPeriodEnd' in subscription && subscription.cancelAtPeriodEnd
                          ? 'Expires'
                          : 'Renews'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                )}

              {(planType === 'starter' || planType === 'managed') &&
                !canCancelSubscription &&
                getCancellationAvailableDate() && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Minimum Term</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      12 months (ends {formatDate(getCancellationAvailableDate()!)})
                    </span>
                  </div>
                )}
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPortal({ organizationId })}
                disabled={isOpeningPortal}
              >
                {isOpeningPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Payment Method
              </Button>

              {'cancelAtPeriodEnd' in subscription && subscription.cancelAtPeriodEnd ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resumeSubscription({ organizationId })}
                  disabled={isResuming}
                >
                  {isResuming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Resume Subscription
                </Button>
              ) : (
                subscription.status !== 'canceled' &&
                (canCancelSubscription ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isCanceling}
                  >
                    Cancel Subscription
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button variant="outline" size="sm" disabled>
                          <Lock className="mr-2 h-4 w-4" />
                          Cancel Subscription
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This plan requires a 12-month minimum commitment.</p>
                      {getCancellationAvailableDate() && (
                        <p>You can cancel after {formatDate(getCancellationAvailableDate()!)}.</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <CancelSubscriptionDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={() =>
            cancelSubscription({
              organizationId,
              immediate: isTrialing, // Cancel immediately for trials
            })
          }
          isLoading={isCanceling}
          isTrialing={isTrialing}
          currentPeriodEnd={
            'currentPeriodEnd' in subscription && subscription.currentPeriodEnd !== null
              ? subscription.currentPeriodEnd
              : undefined
          }
        />
      </div>
    </TooltipProvider>
  );
}

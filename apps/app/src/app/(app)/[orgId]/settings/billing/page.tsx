'use client';

import { cancelSubscriptionAction } from '@/app/api/stripe/cancel-subscription/cancel-subscription';
import { createPortalSessionAction } from '@/app/api/stripe/create-portal-session/create-portal-session';
import { generateCheckoutSessionAction } from '@/app/api/stripe/generate-checkout-session/generate-checkout-session';
import { resumeSubscriptionAction } from '@/app/api/stripe/resume-subscription/resume-subscription';
import { useSubscription } from '@/context/subscription-context';
import { Alert, AlertDescription } from '@comp/ui/alert';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Separator } from '@comp/ui/separator';
import { AlertCircle, Calendar, Check, Clock, CreditCard, Loader2, Sparkles } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { CancelSubscriptionDialog } from './cancel-subscription-dialog';

export default function BillingPage() {
  const { subscription, hasActiveSubscription, isTrialing, isSelfServe } = useSubscription();
  const router = useRouter();
  const params = useParams();
  const organizationId = params.orgId as string;
  const [showCancelDialog, setShowCancelDialog] = useState(false);

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

  // Action for creating checkout session
  const { execute: createCheckout, isExecuting: isCreatingCheckout } = useAction(
    generateCheckoutSessionAction,
    {
      onSuccess: ({ data }) => {
        if (data?.checkoutUrl) {
          router.push(data.checkoutUrl);
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to create checkout session');
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle self-serve (free plan) users
  if (isSelfServe) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Free Plan (Starter)</CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription>You're currently on our free self-serve plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Your plan includes:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Complete access to manage your compliance program</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Generate policies and documentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Basic integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Community support</span>
                </li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Want more features?</p>
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  Upgrade to our Done For You plan for expert assistance, priority support, and
                  advanced features.
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

  // Show upgrade prompt if no active subscription
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

  // Show trial warning
  const renderTrialWarning = () => {
    if (isTrialing && 'currentPeriodEnd' in subscription && subscription.currentPeriodEnd) {
      const daysLeft = Math.ceil(
        (subscription.currentPeriodEnd * 1000 - Date.now()) / (1000 * 60 * 60 * 24),
      );

      return (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Your trial expires in {daysLeft} days. Subscribe now to continue using all features.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  // Show cancellation warning
  const renderCancellationWarning = () => {
    if ('cancelAtPeriodEnd' in subscription && subscription.cancelAtPeriodEnd) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your subscription will be canceled at the end of the current billing period.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {renderTrialWarning()}
      {renderCancellationWarning()}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subscription Details</CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {'price' in subscription && subscription.price && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Plan</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {subscription.product?.name} (
                  {subscription.price.unit_amount
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: subscription.price.currency,
                      }).format(subscription.price.unit_amount / 100)
                    : 'Free'}
                  {subscription.price.interval ? `/${subscription.price.interval}` : ''})
                </span>
              </div>
            )}

            {'currentPeriodStart' in subscription && subscription.currentPeriodStart && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Current Period</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(subscription.currentPeriodStart)}
                </span>
              </div>
            )}

            {'currentPeriodEnd' in subscription && subscription.currentPeriodEnd && (
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
          </div>

          <Separator />

          <div className="space-y-3">
            {'paymentMethod' in subscription && subscription.paymentMethod && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Payment Method</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}
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
              subscription.status !== 'canceled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isCanceling}
                >
                  Cancel Subscription
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={() => cancelSubscription({ organizationId, immediate: false })}
        isLoading={isCanceling}
        currentPeriodEnd={
          'currentPeriodEnd' in subscription && subscription.currentPeriodEnd !== null
            ? subscription.currentPeriodEnd
            : undefined
        }
      />
    </div>
  );
}

import { serverApi } from '@/lib/api-server';
import { Button } from '@trycompai/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BillingActions } from './billing-actions';

interface BillingPageProps {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ success?: string; session_id?: string }>;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  status?: string;
  includedRunsPerPeriod?: number;
  runsThisPeriod?: number;
  currentPeriodEnd?: string;
}

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  const { orgId } = await params;
  const { success, session_id } = await searchParams;

  let successMessage: string | null = null;
  let errorMessage: string | null = null;

  if (success === 'true' && session_id) {
    const res = await serverApi.post('/v1/pentest-billing/handle-success', { sessionId: session_id });
    if (res.error) {
      errorMessage = res.error;
    } else {
      successMessage = 'Subscription activated! You can now create penetration test runs.';
    }
  }

  const statusRes = await serverApi.get<SubscriptionStatus>('/v1/pentest-billing/status');
  const subscription = statusRes.data;

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment &amp; Billing</CardTitle>
          <CardDescription>
            Manage your payment method for all app subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription?.hasSubscription ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Stripe customer connected.
              </p>
              <BillingActions orgId={orgId} action="portal" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Payment method will be set up when you subscribe to an app below.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penetration Testing</CardTitle>
          <CardDescription>
            $99/month — Includes 3 penetration test runs per period. Additional runs charged as
            overage at $49/run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.hasSubscription && subscription.status === 'active' ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize text-green-600">{subscription.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Included runs / period</span>
                <span className="font-medium">{subscription.includedRunsPerPeriod}</span>
              </div>
              {subscription.runsThisPeriod !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Runs used this period</span>
                  <span className="font-medium">
                    {subscription.runsThisPeriod} / {subscription.includedRunsPerPeriod}
                  </span>
                </div>
              )}
              {subscription.currentPeriodEnd && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period ends</span>
                  <span className="font-medium">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ) : subscription?.hasSubscription && subscription.status === 'cancelled' ? (
            <p className="text-sm text-muted-foreground">
              Your subscription has been cancelled. Subscribe below to resume.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active subscription. Subscribe to start running penetration tests.
            </p>
          )}

          {(!subscription?.hasSubscription || subscription.status === 'cancelled') && (
            <BillingActions orgId={orgId} action="subscribe" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Billing',
  };
}

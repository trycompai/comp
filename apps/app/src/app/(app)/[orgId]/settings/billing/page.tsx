import { auth } from '@/utils/auth';
import { db } from '@db';
import { Button } from '@trycompai/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  createBillingPortalSession,
  handleSubscriptionSuccess,
  subscribeToPentestPlan,
} from '../../security/penetration-tests/actions/billing';

interface BillingPageProps {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ success?: string; session_id?: string }>;
}

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  const { orgId } = await params;
  const { success, session_id } = await searchParams;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    redirect('/auth');
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      deactivated: false,
    },
  });

  if (!member) {
    redirect('/');
  }

  let successMessage: string | null = null;
  let errorMessage: string | null = null;

  if (success === 'true' && session_id) {
    // The webhook (checkout.session.completed) is the primary activation path.
    // handleSubscriptionSuccess is a same-request fallback for the case where
    // the webhook hasn't fired yet when the user lands back on this page.
    try {
      await handleSubscriptionSuccess(orgId, session_id);
      successMessage = 'Subscription activated! You can now create penetration test runs.';
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Failed to activate subscription.';
    }
  }

  const billing = await db.organizationBilling.findUnique({
    where: { organizationId: orgId },
  });

  const subscription = await db.pentestSubscription.findUnique({
    where: { organizationId: orgId },
  });

  const runsThisPeriod =
    subscription
      ? await db.securityPenetrationTestRun.count({
          where: {
            organizationId: orgId,
            createdAt: {
              gte: subscription.currentPeriodStart,
              lte: subscription.currentPeriodEnd,
            },
          },
        })
      : null;

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
          {billing ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Stripe customer connected.
              </p>
              <form
                action={async () => {
                  'use server';
                  const { url } = await createBillingPortalSession(orgId);
                  redirect(url);
                }}
              >
                <Button type="submit" variant="outline">
                  Manage payment method
                </Button>
              </form>
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
          {subscription && subscription.status === 'active' ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize text-green-600">{subscription.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Included runs / period</span>
                <span className="font-medium">{subscription.includedRunsPerPeriod}</span>
              </div>
              {runsThisPeriod !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Runs used this period</span>
                  <span className="font-medium">
                    {runsThisPeriod} / {subscription.includedRunsPerPeriod}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period ends</span>
                <span className="font-medium">
                  {subscription.currentPeriodEnd.toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : subscription && subscription.status === 'cancelled' ? (
            <p className="text-sm text-muted-foreground">
              Your subscription has been cancelled. Subscribe below to resume.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active subscription. Subscribe to start running penetration tests.
            </p>
          )}

          {(!subscription || subscription.status === 'cancelled') && (
            <form
              action={async () => {
                'use server';
                const { url } = await subscribeToPentestPlan(orgId);
                redirect(url);
              }}
            >
              <Button type="submit">Subscribe — $99/month (3 runs included)</Button>
            </form>
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

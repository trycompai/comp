import { auth } from '@/utils/auth';
import { db } from '@db';
import { Alert, AlertDescription } from '@comp/ui/alert';
import { Badge } from '@comp/ui/badge';
import { Button } from '@trycompai/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Separator } from '@comp/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@comp/ui/table';
import { InfoIcon } from 'lucide-react';
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
              lt: subscription.currentPeriodEnd,
            },
          },
        })
      : null;

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const pentestIsActive = subscription?.status === 'active';
  const pentestIsCancelled = subscription?.status === 'cancelled';
  const pentestIsPastDue = subscription?.status === 'past_due';

  return (
    <div className="flex flex-col gap-4">
      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>
            Manage your active products and add-ons.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="pr-6 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Compliance */}
              <TableRow>
                <TableCell className="pl-6">
                  <div className="flex flex-col">
                    <span className="font-medium">Compliance</span>
                    <span className="text-xs text-muted-foreground">Managed by account team</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="success">Active</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">Custom</TableCell>
                <TableCell className="text-sm text-muted-foreground">Custom</TableCell>
                <TableCell className="pr-6 text-right" />
              </TableRow>

              {/* Security — Penetration Testing */}
              <TableRow>
                <TableCell className="pl-6">
                  <div className="flex flex-col">
                    <span className="font-medium">Penetration Testing</span>
                    <span className="text-xs text-muted-foreground">Security add-on</span>
                  </div>
                </TableCell>
                <TableCell>
                  {pentestIsActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : pentestIsCancelled ? (
                    <Badge variant="destructive">Cancelled</Badge>
                  ) : pentestIsPastDue ? (
                    <Badge variant="warning">Past due</Badge>
                  ) : (
                    <Badge variant="outline">Not subscribed</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {pentestIsActive && runsThisPeriod !== null ? (
                    <span>
                      <span className="font-medium">{runsThisPeriod}</span>
                      <span className="text-muted-foreground">/{subscription.includedRunsPerPeriod} runs</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {pentestIsActive ? (
                    formatDate(subscription.currentPeriodEnd)
                  ) : pentestIsCancelled && subscription ? (
                    <span className="text-muted-foreground">
                      Ends {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {pentestIsActive && billing ? (
                    <form
                      action={async () => {
                        'use server';
                        const { url } = await createBillingPortalSession(orgId);
                        redirect(url);
                      }}
                    >
                      <Button type="submit" variant="outline" size="sm">
                        Manage
                      </Button>
                    </form>
                  ) : pentestIsPastDue && billing ? (
                    <form
                      action={async () => {
                        'use server';
                        const { url } = await createBillingPortalSession(orgId);
                        redirect(url);
                      }}
                    >
                      <Button type="submit" variant="destructive" size="sm">
                        Fix payment
                      </Button>
                    </form>
                  ) : (
                    <form
                      action={async () => {
                        'use server';
                        const { url } = await subscribeToPentestPlan(orgId);
                        redirect(url);
                      }}
                    >
                      <Button type="submit" size="sm">
                        {pentestIsCancelled ? 'Resubscribe' : 'Subscribe'}
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Penetration Testing — expanded details (only when active) */}
      {pentestIsActive && subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Penetration Testing</CardTitle>
                <CardDescription>
                  Current billing period: {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}
                </CardDescription>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Included runs</p>
                <p className="text-2xl font-semibold tabular-nums">{subscription.includedRunsPerPeriod}</p>
                <p className="text-xs text-muted-foreground">per billing period</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Used this period</p>
                <p className="text-2xl font-semibold tabular-nums">{runsThisPeriod ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {runsThisPeriod !== null && runsThisPeriod > subscription.includedRunsPerPeriod
                    ? `${runsThisPeriod - subscription.includedRunsPerPeriod} overage`
                    : `${Math.max(0, subscription.includedRunsPerPeriod - (runsThisPeriod ?? 0))} remaining`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Member since</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {subscription.createdAt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(subscription.createdAt)}
                </p>
              </div>
            </div>

            {runsThisPeriod !== null && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Period usage</p>
                    <span className="text-sm font-medium tabular-nums">
                      {runsThisPeriod} of {subscription.includedRunsPerPeriod} runs
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        runsThisPeriod > subscription.includedRunsPerPeriod
                          ? 'bg-destructive'
                          : runsThisPeriod === subscription.includedRunsPerPeriod
                            ? 'bg-orange-500'
                            : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, (runsThisPeriod / subscription.includedRunsPerPeriod) * 100)}%` }}
                    />
                  </div>
                  {runsThisPeriod > subscription.includedRunsPerPeriod && (
                    <p className="text-xs text-destructive mt-1.5">
                      {runsThisPeriod - subscription.includedRunsPerPeriod} overage run{runsThisPeriod - subscription.includedRunsPerPeriod !== 1 ? 's' : ''} billed this period
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment method — only show when there's an active self-serve subscription */}
      {billing && pentestIsActive && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment method</CardTitle>
                <CardDescription>
                  Used for self-serve subscriptions like Penetration Testing.
                </CardDescription>
              </div>
              <form
                action={async () => {
                  'use server';
                  const { url } = await createBillingPortalSession(orgId);
                  redirect(url);
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  Update
                </Button>
              </form>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Account-managed billing note */}
      <div className="flex items-start gap-2 px-1">
        <InfoIcon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Compliance billing is managed by your account team. For invoices, payment changes, or
          billing questions related to Compliance, contact your account manager.
        </p>
      </div>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Billing',
  };
}

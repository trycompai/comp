'use client';

import { Card, CardContent, CardHeader, CardTitle, Stack, Text } from '@trycompai/design-system';
import type React from 'react';
import type { BackgroundCheckBillingStatus, BillingUsageRow } from './types';

interface BillingUsageTableProps {
  subscriptions: NonNullable<BackgroundCheckBillingStatus['subscriptions']>;
  usageRows: BillingUsageRow[];
}

export function BillingUsageTable({ subscriptions, usageRows }: BillingUsageTableProps) {
  return (
    <Stack gap="4">
      <div className="grid gap-4 lg:grid-cols-2">
        <AllowanceCard
          label="Penetration Tests"
          subscription={subscriptions.find((item) => item.skuKey === 'pentest_monthly_5')}
        />
        <AllowanceCard
          label="Background Checks"
          subscription={subscriptions.find(
            (item) => item.skuKey === 'background_checks_monthly_25',
          )}
        />
      </div>
      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <Stack gap="1">
            <Text size="lg" weight="semibold">
              Run history
            </Text>
            <Text size="sm" variant="muted">
              Paid service runs for this organization.
            </Text>
          </Stack>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-y bg-muted/20 text-muted-foreground">
                <TableHead>Service</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Run date</TableHead>
                <TableHead>Subscription remaining</TableHead>
              </tr>
            </thead>
            <tbody>
              {usageRows.map((row) => (
                <UsageRow key={row.id} row={row} />
              ))}
              {usageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Text size="sm" variant="muted">
                      No paid service runs yet.
                    </Text>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t px-6 py-4">
          <Text size="sm" variant="muted">
            {usageRows.length} service run{usageRows.length === 1 ? '' : 's'}
          </Text>
        </div>
      </div>
    </Stack>
  );
}

function AllowanceCard({
  label,
  subscription,
}: {
  label: string;
  subscription?: NonNullable<BackgroundCheckBillingStatus['subscriptions']>[number];
}) {
  const remaining = subscription
    ? Math.max(subscription.includedQuantity - subscription.usedQuantity, 0)
    : null;

  return (
    <Card width="full">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="2">
          <Text size="lg" weight="semibold" font="mono">
            {remaining ?? 0}
          </Text>
          <Text size="sm" variant="muted">
            {subscription
              ? `${subscription.usedQuantity} of ${subscription.includedQuantity} used this period.`
              : 'No active monthly subscription.'}
          </Text>
          {subscription?.currentPeriodEnd && (
            <Text size="xs" variant="muted">
              Renews {formatDate(subscription.currentPeriodEnd)}
            </Text>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function UsageRow({ row }: { row: BillingUsageRow }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-6 py-4 font-medium">{row.service}</td>
      <td className="px-6 py-4 text-muted-foreground">{row.details}</td>
      <td className="px-6 py-4 text-muted-foreground">{row.billingType}</td>
      <td className="px-6 py-4 text-muted-foreground">{row.status}</td>
      <td className="px-6 py-4 text-muted-foreground">{formatDate(row.createdAt)}</td>
      <td className="px-6 py-4 text-muted-foreground">{formatRemaining(row)}</td>
    </tr>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 font-medium">{children}</th>;
}

function formatRemaining(row: BillingUsageRow) {
  if (row.subscriptionRemaining === null || row.subscriptionIncluded === null) {
    return 'No subscription';
  }
  return `${row.subscriptionRemaining} of ${row.subscriptionIncluded}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

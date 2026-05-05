'use client';

import { Badge, Button, Text } from '@trycompai/design-system';
import type {
  AdminBillingCreditBalance,
  AdminBillingInvoice,
  AdminBillingSubscription,
} from './AdminBillingTypes';

export function SubscriptionRows({
  subscriptions,
  onCancel,
  onResume,
  loadingId,
}: {
  subscriptions: AdminBillingSubscription[];
  onCancel: (subscription: AdminBillingSubscription, immediate: boolean) => void;
  onResume: (subscription: AdminBillingSubscription) => void;
  loadingId: string | null;
}) {
  if (subscriptions.length === 0) {
    return <Text variant="muted">No subscription history.</Text>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Usage</th>
            <th className="px-4 py-3">Renews</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription) => (
            <tr key={subscription.id} className="border-t">
              <td className="px-4 py-3 font-medium">{subscription.skuKey}</td>
              <td className="px-4 py-3">
                <Badge variant={subscription.stripeStatus === 'active' ? 'default' : 'outline'}>
                  {subscription.cancelAtPeriodEnd ? 'canceling' : subscription.stripeStatus}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {subscription.usedQuantity} / {subscription.includedQuantity}
              </td>
              <td className="px-4 py-3">{formatDate(subscription.currentPeriodEnd)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  {subscription.cancelAtPeriodEnd ? (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={loadingId === subscription.id}
                      onClick={() => onResume(subscription)}
                    >
                      Resume
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={loadingId === subscription.id}
                        onClick={() => onCancel(subscription, false)}
                      >
                        Cancel later
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        loading={loadingId === subscription.id}
                        onClick={() => onCancel(subscription, true)}
                      >
                        Cancel now
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CreditBalanceRows({ balances }: { balances: AdminBillingCreditBalance[] }) {
  if (balances.length === 0) return <Text variant="muted">No free credits.</Text>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {balances.map((balance) => (
        <div key={balance.id} className="rounded-lg border p-4">
          <Text size="sm" variant="muted">
            {formatProduct(balance.productKey)}
          </Text>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{balance.balance}</div>
          <Text size="sm" variant="muted">
            {balance.totalGranted} granted, {balance.totalConsumed} consumed
          </Text>
        </div>
      ))}
    </div>
  );
}

export function InvoiceRows({
  invoices,
  onRetryLink,
  loadingId,
}: {
  invoices: AdminBillingInvoice[];
  onRetryLink: (invoice: AdminBillingInvoice) => void;
  loadingId: string | null;
}) {
  if (invoices.length === 0) return <Text variant="muted">No invoices yet.</Text>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3">Invoice</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-t">
              <td className="px-4 py-3 font-medium">{invoice.number}</td>
              <td className="px-4 py-3">
                <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                  {invoice.status}
                </Badge>
              </td>
              <td className="px-4 py-3">{formatAmount(invoice.amountDue, invoice.currency)}</td>
              <td className="px-4 py-3">{formatDate(invoice.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  loading={loadingId === invoice.id}
                  onClick={() => onRetryLink(invoice)}
                >
                  Recovery link
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'n/a';
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatProduct(value: string) {
  return value === 'pentest' ? 'Penetration tests' : 'Background checks';
}

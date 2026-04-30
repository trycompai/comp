'use client';

import { Badge, Button, Input, Stack, Text } from '@trycompai/design-system';
import { Download, Launch, Search } from '@trycompai/design-system/icons';
import type React from 'react';
import { useMemo, useState } from 'react';
import type { BillingInvoice } from './types';

interface BillingInvoicesTableProps {
  invoices: BillingInvoice[];
}

export function BillingInvoicesTable({ invoices }: BillingInvoicesTableProps) {
  const [query, setQuery] = useState('');
  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return invoices;

    return invoices.filter((invoice) => {
      const searchable = [
        invoice.number,
        invoice.status,
        invoice.type,
        formatAmount(invoice.amountPaid, invoice.currency),
        formatDate(invoice.createdAt),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [invoices, query]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6">
        <Stack gap="4">
          <Stack gap="1">
            <Text size="lg" weight="semibold">
              Invoices
            </Text>
            <Text size="sm" variant="muted">
              View and download invoices for paid services.
            </Text>
          </Stack>
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                <Search size={16} />
              </span>
              <Input
                aria-label="Search invoices"
                placeholder="Search invoices..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </Stack>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-y bg-muted/20 text-muted-foreground">
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center">
                  <Text size="sm" variant="muted">
                    {invoices.length === 0 ? 'No invoices yet.' : 'No invoices match your search.'}
                  </Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t px-6 py-4">
        <Text size="sm" variant="muted">
          {filteredInvoices.length} of {invoices.length} invoice
          {invoices.length === 1 ? '' : 's'}
        </Text>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: BillingInvoice }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-6 py-4 font-medium">{invoice.number}</td>
      <td className="px-6 py-4 text-muted-foreground">{formatDate(invoice.createdAt)}</td>
      <td className="px-6 py-4 text-muted-foreground">
        {invoice.dueDate ? formatDate(invoice.dueDate) : 'On receipt'}
      </td>
      <td className="px-6 py-4">{formatAmount(invoice.amountPaid, invoice.currency)}</td>
      <td className="px-6 py-4">
        <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
          {formatStatus(invoice.status)}
        </Badge>
      </td>
      <td className="px-6 py-4 text-muted-foreground">{invoice.type}</td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          {invoice.hostedInvoiceUrl && (
            <Button
              type="button"
              variant="outline"
              iconLeft={<Launch size={16} />}
              onClick={() =>
                window.open(invoice.hostedInvoiceUrl ?? undefined, '_blank', 'noopener,noreferrer')
              }
            >
              View
            </Button>
          )}
          {invoice.invoicePdfUrl && (
            <Button
              type="button"
              variant="outline"
              iconLeft={<Download size={16} />}
              onClick={() =>
                window.open(invoice.invoicePdfUrl ?? undefined, '_blank', 'noopener,noreferrer')
              }
            >
              PDF
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 font-medium">{children}</th>;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

import type Stripe from 'stripe';
import { getBillingSkuByStripePriceId } from '@trycompai/billing';
import type { StripeService } from '../stripe/stripe.service';

export interface BillingInvoice {
  id: string;
  number: string;
  createdAt: string;
  dueDate: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  type: 'Subscription' | 'One Time';
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
}

export async function listBillingInvoices(params: {
  stripeService: StripeService;
  stripeCustomerId: string | null;
}): Promise<BillingInvoice[]> {
  if (!params.stripeCustomerId || !params.stripeService.isConfigured()) {
    return [];
  }

  const stripe = params.stripeService.getClient();
  const invoices = await stripe.invoices.list({
    customer: params.stripeCustomerId,
    limit: 20,
  });

  return invoices.data.map(mapInvoice);
}

function mapInvoice(invoice: Stripe.Invoice): BillingInvoice {
  return {
    id: invoice.id,
    number: invoice.number ?? invoice.id,
    createdAt: new Date(invoice.created * 1000).toISOString(),
    dueDate: invoice.due_date
      ? new Date(invoice.due_date * 1000).toISOString()
      : null,
    amountPaid: invoice.amount_paid,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
    status: invoice.status ?? 'unknown',
    type: hasSubscription(invoice) ? 'Subscription' : 'One Time',
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
  };
}

function hasSubscription(invoice: Stripe.Invoice): boolean {
  if (invoice.billing_reason?.startsWith('subscription')) {
    return true;
  }

  return invoice.lines.data.some(isSubscriptionLine);
}

function isSubscriptionLine(line: Stripe.InvoiceLineItem): boolean {
  if (line.parent?.subscription_item_details?.subscription) {
    return true;
  }

  if (line.subscription) {
    return true;
  }

  const priceId = getLinePriceId(line);
  if (!priceId) {
    return false;
  }

  const sku = getBillingSkuByStripePriceId({ stripePriceId: priceId });
  return sku?.cadence === 'month';
}

function getLinePriceId(line: Stripe.InvoiceLineItem): string | null {
  const price = line.pricing?.price_details?.price;
  if (typeof price === 'string') {
    return price;
  }

  if (isRecord(price) && typeof price.id === 'string') {
    return price.id;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

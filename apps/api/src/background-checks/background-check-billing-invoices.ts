import Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';

export interface BackgroundCheckBillingInvoice {
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

export async function listBackgroundCheckBillingInvoices({
  stripeService,
  stripeCustomerId,
}: {
  stripeService: StripeService;
  stripeCustomerId: string | null;
}): Promise<BackgroundCheckBillingInvoice[]> {
  if (!stripeCustomerId || !stripeService.isConfigured()) {
    return [];
  }

  const stripe = stripeService.getClient();
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit: 10,
  });

  return invoices.data.map(toBillingInvoice);
}

function toBillingInvoice(
  invoice: Stripe.Invoice,
): BackgroundCheckBillingInvoice {
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
    type:
      invoice.parent?.type === 'subscription_details'
        ? 'Subscription'
        : 'One Time',
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
  };
}

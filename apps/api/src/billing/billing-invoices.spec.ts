import type Stripe from 'stripe';
import type { StripeService } from '../stripe/stripe.service';
import { listBillingInvoices } from './billing-invoices';

function mockStripeService(params: { invoices: Stripe.Invoice[] }): StripeService {
  const invoicesList = jest.fn().mockResolvedValue({ data: params.invoices });
  return {
    isConfigured: () => true,
    getClient: () => ({
      invoices: {
        list: invoicesList,
      },
    }),
  } as unknown as StripeService;
}

function createInvoice(params: {
  id: string;
  amountPaid: number;
  priceId: string;
  billingReason?: Stripe.Invoice.BillingReason | null;
}): Stripe.Invoice {
  const line = {
    id: `il_${params.id}`,
    object: 'line_item',
    parent: null,
    pricing: {
      type: 'price_details',
      unit_amount_decimal: String(params.amountPaid),
      price_details: {
        price: params.priceId,
        product: 'prod_test',
      },
    },
    subscription: null,
  } as unknown as Stripe.InvoiceLineItem;

  return {
    id: params.id,
    number: `${params.id}-0001`,
    created: 1777564800,
    due_date: null,
    amount_paid: params.amountPaid,
    amount_due: params.amountPaid,
    currency: 'usd',
    status: 'paid',
    billing_reason: params.billingReason ?? 'manual',
    hosted_invoice_url: `https://invoice.stripe.test/${params.id}`,
    invoice_pdf: `https://invoice.stripe.test/${params.id}.pdf`,
    lines: {
      object: 'list',
      data: [line],
      has_more: false,
      url: `/v1/invoices/${params.id}/lines`,
    },
  } as unknown as Stripe.Invoice;
}

describe('listBillingInvoices', () => {
  it('labels subscription catalog invoices as subscriptions', async () => {
    const invoices = await listBillingInvoices({
      stripeService: mockStripeService({
        invoices: [
          createInvoice({
            id: 'in_subscription',
            amountPaid: 39900,
            priceId: 'price_1TRya6CkFWhKYvHI1sJ2M2no',
          }),
        ],
      }),
      stripeCustomerId: 'cus_1',
    });

    expect(invoices).toEqual([
      expect.objectContaining({
        id: 'in_subscription',
        amountPaid: 39900,
        type: 'Subscription',
      }),
    ]);
  });

  it('keeps one-time catalog invoices labelled as one-time', async () => {
    const invoices = await listBillingInvoices({
      stripeService: mockStripeService({
        invoices: [
          createInvoice({
            id: 'in_one_time',
            amountPaid: 4900,
            priceId: 'price_1TRWckCkFWhKYvHIA1GLv1sO',
          }),
        ],
      }),
      stripeCustomerId: 'cus_1',
    });

    expect(invoices).toEqual([
      expect.objectContaining({
        id: 'in_one_time',
        amountPaid: 4900,
        type: 'One Time',
      }),
    ]);
  });
});

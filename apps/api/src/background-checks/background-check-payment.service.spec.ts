import { HttpStatus } from '@nestjs/common';
import { db } from '@db';
import { BillingEntitlementsService } from '../billing/billing-entitlements.service';
import { StripeService } from '../stripe/stripe.service';
import { BackgroundCheckBillingService } from './background-check-billing.service';
import { BackgroundCheckPaymentService } from './background-check-payment.service';

jest.mock('@db', () => ({
  db: {
    organizationBilling: {
      findUnique: jest.fn(),
    },
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;

function mockAsync<T>(fn: unknown): jest.MockedFunction<() => Promise<T>> {
  return fn as jest.MockedFunction<() => Promise<T>>;
}

function mockEntitlements(
  overrides: Partial<BillingEntitlementsService> = {},
): BillingEntitlementsService {
  return {
    tryConsumeIncludedUsage: jest
      .fn()
      .mockResolvedValue({ status: 'not_configured' }),
    recordOneTimeUsage: jest.fn().mockResolvedValue(undefined),
    refundIncludedUsage: jest.fn().mockResolvedValue(undefined),
    syncSubscriptionItem: jest.fn().mockResolvedValue(undefined),
    writeAuditEvent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as BillingEntitlementsService;
}

function mockBillingRow() {
  return {
    id: 'obil_1',
    organizationId: 'org_1',
    stripeCustomerId: 'cus_1',
    stripePaymentMethodId: 'pm_1',
    paymentMethodUpdatedAt: null,
    createdAt: new Date('2026-04-30T00:00:00.000Z'),
    updatedAt: new Date('2026-04-30T00:00:00.000Z'),
  };
}

describe('BackgroundCheckPaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws payment required when no background check payment method exists', async () => {
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.findUnique>>>(
      mockedDb.organizationBilling.findUnique,
    ).mockResolvedValueOnce(null);
    const service = new BackgroundCheckPaymentService(
      { getClient: jest.fn() } as unknown as StripeService,
      {
        getBackgroundCheckPrice: jest.fn(),
      } as unknown as BackgroundCheckBillingService,
      mockEntitlements(),
    );

    await expect(
      service.charge({ organizationId: 'org_1', memberId: 'mem_1' }),
    ).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.PAYMENT_REQUIRED,
      }),
    );
  });

  it('creates and pays a Stripe invoice with payment-method scoped idempotency keys', async () => {
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.findUnique>>>(
      mockedDb.organizationBilling.findUnique,
    ).mockResolvedValueOnce(mockBillingRow());
    const invoiceItemsCreate = jest.fn().mockResolvedValue({ id: 'ii_1' });
    const invoicesCreate = jest.fn().mockResolvedValue({ id: 'in_1' });
    const finalizeInvoice = jest.fn().mockResolvedValue({ id: 'in_1' });
    const invoicesPay = jest.fn().mockResolvedValue({
      id: 'in_1',
      status: 'paid',
      payments: {
        data: [
          {
            payment: {
              type: 'payment_intent',
              payment_intent: 'pi_1',
            },
          },
        ],
      },
    });
    const service = new BackgroundCheckPaymentService(
      {
        getClient: () => ({
          invoiceItems: { create: invoiceItemsCreate },
          invoices: {
            create: invoicesCreate,
            finalizeInvoice,
            pay: invoicesPay,
          },
        }),
      } as unknown as StripeService,
      {
        getBackgroundCheckPrice: jest.fn().mockResolvedValue({
          id: 'price_bg',
          unitAmount: 1250,
          currency: 'usd',
        }),
      } as unknown as BackgroundCheckBillingService,
      mockEntitlements(),
    );

    await expect(
      service.charge({ organizationId: 'org_1', memberId: 'mem_1' }),
    ).resolves.toMatchObject({
      paymentIntentId: 'pi_1',
      invoiceId: 'in_1',
      status: 'succeeded',
    });

    expect(invoicesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_1',
        collection_method: 'charge_automatically',
        description: 'Comp AI - Background Check x1',
        default_payment_method: 'pm_1',
        statement_descriptor: 'COMP AI BG CHECK',
      }),
      { idempotencyKey: 'background-check:org_1:mem_1:price_bg:pm_1:invoice' },
    );
    expect(invoiceItemsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_1',
        invoice: 'in_1',
        pricing: {
          price: 'price_bg',
        },
        quantity: 1,
      }),
      {
        idempotencyKey: 'background-check:org_1:mem_1:price_bg:pm_1:line-item',
      },
    );
    expect(finalizeInvoice).toHaveBeenCalledWith(
      'in_1',
      { auto_advance: false },
      {
        idempotencyKey:
          'background-check:org_1:mem_1:price_bg:pm_1:finalize-invoice',
      },
    );
    expect(invoicesPay).toHaveBeenCalledWith(
      'in_1',
      expect.objectContaining({
        payment_method: 'pm_1',
        off_session: true,
      }),
      {
        idempotencyKey:
          'background-check:org_1:mem_1:price_bg:pm_1:pay-invoice',
      },
    );
  });

  it('deletes the draft invoice when adding the invoice item fails', async () => {
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.findUnique>>>(
      mockedDb.organizationBilling.findUnique,
    ).mockResolvedValueOnce(mockBillingRow());
    const invoiceItemsCreate = jest
      .fn()
      .mockRejectedValue(new Error('line item failed'));
    const invoicesCreate = jest.fn().mockResolvedValue({ id: 'in_1' });
    const finalizeInvoice = jest.fn();
    const invoicesPay = jest.fn();
    const deleteInvoice = jest.fn().mockResolvedValue({ id: 'in_1' });
    const voidInvoice = jest.fn();
    const service = new BackgroundCheckPaymentService(
      {
        getClient: () => ({
          invoiceItems: { create: invoiceItemsCreate },
          invoices: {
            create: invoicesCreate,
            finalizeInvoice,
            pay: invoicesPay,
            del: deleteInvoice,
            voidInvoice,
          },
        }),
      } as unknown as StripeService,
      {
        getBackgroundCheckPrice: jest.fn().mockResolvedValue({
          id: 'price_bg',
          unitAmount: 1250,
          currency: 'usd',
        }),
      } as unknown as BackgroundCheckBillingService,
      mockEntitlements(),
    );

    await expect(
      service.charge({ organizationId: 'org_1', memberId: 'mem_1' }),
    ).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.PAYMENT_REQUIRED,
      }),
    );

    expect(deleteInvoice).toHaveBeenCalledWith('in_1');
    expect(voidInvoice).not.toHaveBeenCalled();
    expect(finalizeInvoice).not.toHaveBeenCalled();
    expect(invoicesPay).not.toHaveBeenCalled();
  });

  it('deletes the draft invoice when finalizing fails', async () => {
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.findUnique>>>(
      mockedDb.organizationBilling.findUnique,
    ).mockResolvedValueOnce(mockBillingRow());
    const invoiceItemsCreate = jest.fn().mockResolvedValue({ id: 'ii_1' });
    const invoicesCreate = jest.fn().mockResolvedValue({ id: 'in_1' });
    const finalizeInvoice = jest
      .fn()
      .mockRejectedValue(new Error('finalize failed'));
    const invoicesPay = jest.fn();
    const deleteInvoice = jest.fn().mockResolvedValue({ id: 'in_1' });
    const voidInvoice = jest.fn();
    const service = new BackgroundCheckPaymentService(
      {
        getClient: () => ({
          invoiceItems: { create: invoiceItemsCreate },
          invoices: {
            create: invoicesCreate,
            finalizeInvoice,
            pay: invoicesPay,
            del: deleteInvoice,
            voidInvoice,
          },
        }),
      } as unknown as StripeService,
      {
        getBackgroundCheckPrice: jest.fn().mockResolvedValue({
          id: 'price_bg',
          unitAmount: 1250,
          currency: 'usd',
        }),
      } as unknown as BackgroundCheckBillingService,
      mockEntitlements(),
    );

    await expect(
      service.charge({ organizationId: 'org_1', memberId: 'mem_1' }),
    ).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.PAYMENT_REQUIRED,
      }),
    );

    expect(deleteInvoice).toHaveBeenCalledWith('in_1');
    expect(voidInvoice).not.toHaveBeenCalled();
    expect(invoicesPay).not.toHaveBeenCalled();
  });

  it('voids the finalized invoice when paying fails', async () => {
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.findUnique>>>(
      mockedDb.organizationBilling.findUnique,
    ).mockResolvedValueOnce(mockBillingRow());
    const invoiceItemsCreate = jest.fn().mockResolvedValue({ id: 'ii_1' });
    const invoicesCreate = jest.fn().mockResolvedValue({ id: 'in_1' });
    const finalizeInvoice = jest.fn().mockResolvedValue({ id: 'in_1' });
    const invoicesPay = jest.fn().mockRejectedValue(new Error('pay failed'));
    const deleteInvoice = jest.fn();
    const voidInvoice = jest.fn().mockResolvedValue({ id: 'in_1' });
    const service = new BackgroundCheckPaymentService(
      {
        getClient: () => ({
          invoiceItems: { create: invoiceItemsCreate },
          invoices: {
            create: invoicesCreate,
            finalizeInvoice,
            pay: invoicesPay,
            del: deleteInvoice,
            voidInvoice,
          },
        }),
      } as unknown as StripeService,
      {
        getBackgroundCheckPrice: jest.fn().mockResolvedValue({
          id: 'price_bg',
          unitAmount: 1250,
          currency: 'usd',
        }),
      } as unknown as BackgroundCheckBillingService,
      mockEntitlements(),
    );

    await expect(
      service.charge({ organizationId: 'org_1', memberId: 'mem_1' }),
    ).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.PAYMENT_REQUIRED,
      }),
    );

    expect(deleteInvoice).not.toHaveBeenCalled();
    expect(voidInvoice).toHaveBeenCalledWith('in_1');
  });
});

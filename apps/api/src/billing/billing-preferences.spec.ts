import { db } from '@db';
import type Stripe from 'stripe';
import type { StripeService } from '../stripe/stripe.service';
import { updateBillingPreferences } from './billing-preferences';

jest.mock('@db', () => ({
  db: {
    organizationBilling: {
      findUnique: jest.fn(),
    },
  },
}));

const organizationBillingFindUnique = db.organizationBilling
  .findUnique as unknown as jest.Mock;

function mockStripeService(client: unknown): StripeService {
  return {
    isConfigured: () => true,
    getClient: () => client,
  } as unknown as StripeService;
}

function createCustomer(): Stripe.Customer {
  return {
    id: 'cus_1',
    object: 'customer',
    address: {
      line1: '1 Test Street',
      line2: null,
      city: 'London',
      state: null,
      postal_code: 'SW1A 1AA',
      country: 'GB',
    },
    business_name: 'Test Company',
    created: 1777564800,
    default_source: null,
    description: null,
    email: 'accounts@example.com',
    invoice_settings: {
      custom_fields: [{ name: 'PO / Reference', value: 'PO-123' }],
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    livemode: false,
    metadata: {},
    name: 'Test Company',
    shipping: null,
  } as unknown as Stripe.Customer;
}

describe('updateBillingPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    organizationBillingFindUnique.mockResolvedValue({
      stripeCustomerId: 'cus_1',
    });
  });

  it('updates the Stripe customer fields used for B2B invoices', async () => {
    const customersUpdate = jest.fn().mockResolvedValue(createCustomer());
    const taxIdsList = jest.fn().mockResolvedValue({ data: [] });
    const taxIdsCreate = jest.fn().mockResolvedValue({
      id: 'txi_1',
      type: 'gb_vat',
      value: 'GB123456789',
      verification: { status: 'verified' },
    });

    const result = await updateBillingPreferences({
      stripeService: mockStripeService({
        customers: { update: customersUpdate },
        taxIds: { list: taxIdsList, create: taxIdsCreate, del: jest.fn() },
      }),
      organizationId: 'org_1',
      preferences: {
        companyName: 'Test Company',
        billingEmail: 'accounts@example.com',
        purchaseOrder: 'PO-123',
        address: {
          line1: '1 Test Street',
          line2: null,
          city: 'London',
          state: null,
          postalCode: 'SW1A 1AA',
          country: 'gb',
        },
        taxId: { type: 'gb_vat', value: 'GB123456789' },
      },
    });

    expect(customersUpdate).toHaveBeenCalledWith(
      'cus_1',
      expect.objectContaining({
        email: 'accounts@example.com',
        name: 'Test Company',
        business_name: 'Test Company',
        address: expect.objectContaining({ country: 'GB' }),
        invoice_settings: {
          custom_fields: [{ name: 'PO / Reference', value: 'PO-123' }],
        },
      }),
    );
    expect(taxIdsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'gb_vat',
        value: 'GB123456789',
        owner: { type: 'customer', customer: 'cus_1' },
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining('cus_1'),
      }),
    );
    expect(result.preferences).toEqual(
      expect.objectContaining({
        billingEmail: 'accounts@example.com',
        purchaseOrder: 'PO-123',
        taxId: expect.objectContaining({ type: 'gb_vat' }),
      }),
    );
  });

  it('sends empty strings to Stripe to clear blank address fields', async () => {
    const customersUpdate = jest.fn().mockResolvedValue({
      ...createCustomer(),
      address: null,
    });
    const taxIdsList = jest.fn().mockResolvedValue({ data: [] });

    await updateBillingPreferences({
      stripeService: mockStripeService({
        customers: { update: customersUpdate },
        taxIds: { list: taxIdsList, create: jest.fn(), del: jest.fn() },
      }),
      organizationId: 'org_1',
      preferences: {
        companyName: 'Test Company',
        billingEmail: 'accounts@example.com',
        purchaseOrder: null,
        address: {
          line1: '',
          line2: null,
          city: '',
          state: null,
          postalCode: '',
          country: '',
        },
        taxId: null,
      },
    });

    expect(customersUpdate).toHaveBeenCalledWith(
      'cus_1',
      expect.objectContaining({
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
        },
      }),
    );
  });
});

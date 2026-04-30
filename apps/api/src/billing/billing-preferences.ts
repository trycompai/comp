import type Stripe from 'stripe';
import { BadRequestException } from '@nestjs/common';
import type { StripeService } from '../stripe/stripe.service';
import { findOrCreateBillingCustomer } from './billing-customer';

export const billingTaxIdTypes = [
  'gb_vat',
  'eu_vat',
  'us_ein',
  'au_abn',
  'ca_bn',
  'nz_gst',
  'sg_gst',
  'sg_uen',
] as const satisfies readonly Stripe.TaxId.Type[];

export type BillingTaxIdType = (typeof billingTaxIdTypes)[number];

export interface BillingPreferences {
  companyName: string | null;
  billingEmail: string | null;
  purchaseOrder: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  taxId: {
    id: string;
    type: string;
    value: string;
    verificationStatus: string | null;
  } | null;
}

export interface BillingPreferencesInput {
  companyName: string;
  billingEmail: string;
  purchaseOrder: string | null;
  address: BillingPreferences['address'];
  taxId: {
    type: string | null;
    value: string | null;
  } | null;
}

const purchaseOrderFieldName = 'PO / Reference';

export async function getBillingPreferences(params: {
  stripeService: StripeService;
  stripeCustomerId: string | null;
  fallbackCompanyName: string | null;
}): Promise<BillingPreferences> {
  if (!params.stripeCustomerId || !params.stripeService.isConfigured()) {
    return createEmptyPreferences({ companyName: params.fallbackCompanyName });
  }

  const stripe = params.stripeService.getClient();
  const [customer, taxIds] = await Promise.all([
    stripe.customers.retrieve(params.stripeCustomerId),
    listCustomerTaxIds({ stripe, stripeCustomerId: params.stripeCustomerId }),
  ]);

  if (isDeletedCustomer(customer)) {
    return createEmptyPreferences({ companyName: params.fallbackCompanyName });
  }

  return mapCustomerPreferences({ customer, taxId: taxIds[0] ?? null });
}

export async function updateBillingPreferences(params: {
  stripeService: StripeService;
  organizationId: string;
  preferences: BillingPreferencesInput;
}): Promise<{ stripeCustomerId: string; preferences: BillingPreferences }> {
  validatePreferences(params.preferences);

  const stripeCustomerId = await findOrCreateBillingCustomer({
    stripeService: params.stripeService,
    organizationId: params.organizationId,
    customerEmail: params.preferences.billingEmail,
  });
  const stripe = params.stripeService.getClient();
  const existingTaxIds = await listCustomerTaxIds({ stripe, stripeCustomerId });
  const customer = await stripe.customers.update(stripeCustomerId, {
    email: params.preferences.billingEmail,
    name: params.preferences.companyName,
    business_name: params.preferences.companyName,
    address: toStripeAddress(params.preferences.address),
    invoice_settings: {
      custom_fields: params.preferences.purchaseOrder
        ? [{ name: purchaseOrderFieldName, value: params.preferences.purchaseOrder }]
        : '',
    },
    metadata: { organizationId: params.organizationId },
  });

  const taxId = await syncPrimaryTaxId({
    stripe,
    stripeCustomerId,
    existingTaxId: existingTaxIds[0] ?? null,
    taxId: params.preferences.taxId,
  });

  return {
    stripeCustomerId,
    preferences: mapCustomerPreferences({ customer, taxId }),
  };
}

function validatePreferences(preferences: BillingPreferencesInput): void {
  if (!preferences.companyName.trim()) {
    throw new BadRequestException('Company name is required.');
  }
  if (!preferences.billingEmail.trim()) {
    throw new BadRequestException('Billing email is required.');
  }

  const type = preferences.taxId?.type?.trim() ?? '';
  const value = preferences.taxId?.value?.trim() ?? '';
  if (type && !isSupportedTaxIdType(type)) {
    throw new BadRequestException('Unsupported tax ID type.');
  }
  if ((type && !value) || (!type && value)) {
    throw new BadRequestException('Tax ID type and value must be set together.');
  }
}

async function syncPrimaryTaxId(params: {
  stripe: Stripe;
  stripeCustomerId: string;
  existingTaxId: Stripe.TaxId | null;
  taxId: BillingPreferencesInput['taxId'];
}): Promise<Stripe.TaxId | null> {
  const type = params.taxId?.type?.trim() ?? '';
  const value = params.taxId?.value?.trim() ?? '';
  if (!type || !value) {
    if (params.existingTaxId) {
      await params.stripe.taxIds.del(params.existingTaxId.id);
    }
    return null;
  }

  if (params.existingTaxId?.type === type && params.existingTaxId.value === value) {
    return params.existingTaxId;
  }

  if (params.existingTaxId) {
    await params.stripe.taxIds.del(params.existingTaxId.id);
  }

  if (!isSupportedTaxIdType(type)) {
    throw new BadRequestException('Unsupported tax ID type.');
  }

  return params.stripe.taxIds.create(
    {
      type,
      value,
      owner: { type: 'customer', customer: params.stripeCustomerId },
    },
    {
      idempotencyKey: [
        'billing-tax-id',
        params.stripeCustomerId,
        type,
        value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      ].join(':'),
    },
  );
}

async function listCustomerTaxIds(params: {
  stripe: Stripe;
  stripeCustomerId: string;
}): Promise<Stripe.TaxId[]> {
  const taxIds = await params.stripe.taxIds.list({
    owner: { type: 'customer', customer: params.stripeCustomerId },
    limit: 5,
  });
  return taxIds.data;
}

function mapCustomerPreferences(params: {
  customer: Stripe.Customer;
  taxId: Stripe.TaxId | null;
}): BillingPreferences {
  return {
    companyName: params.customer.name ?? params.customer.business_name ?? null,
    billingEmail: params.customer.email ?? null,
    purchaseOrder: findInvoiceCustomFieldValue(params.customer, purchaseOrderFieldName),
    address: {
      line1: params.customer.address?.line1 ?? null,
      line2: params.customer.address?.line2 ?? null,
      city: params.customer.address?.city ?? null,
      state: params.customer.address?.state ?? null,
      postalCode: params.customer.address?.postal_code ?? null,
      country: params.customer.address?.country ?? null,
    },
    taxId: params.taxId
      ? {
          id: params.taxId.id,
          type: params.taxId.type,
          value: params.taxId.value,
          verificationStatus: params.taxId.verification?.status ?? null,
        }
      : null,
  };
}

function toStripeAddress(address: BillingPreferences['address']): Stripe.AddressParam {
  return {
    line1: emptyToUndefined(address.line1),
    line2: emptyToUndefined(address.line2),
    city: emptyToUndefined(address.city),
    state: emptyToUndefined(address.state),
    postal_code: emptyToUndefined(address.postalCode),
    country: emptyToUndefined(address.country)?.toUpperCase(),
  };
}

function createEmptyPreferences(params: { companyName: string | null }): BillingPreferences {
  return {
    companyName: params.companyName,
    billingEmail: null,
    purchaseOrder: null,
    address: {
      line1: null,
      line2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
    },
    taxId: null,
  };
}

function findInvoiceCustomFieldValue(customer: Stripe.Customer, name: string): string | null {
  return (
    customer.invoice_settings.custom_fields?.find((field) => field.name === name)?.value ?? null
  );
}

function emptyToUndefined(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isDeletedCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): customer is Stripe.DeletedCustomer {
  return 'deleted' in customer && customer.deleted === true;
}

function isSupportedTaxIdType(value: string): value is BillingTaxIdType {
  return billingTaxIdTypes.some((type) => type === value);
}

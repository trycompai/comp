import { z } from 'zod';
import type { BillingPreferences } from './types';

export const taxIdTypes = [
  { value: 'none', label: 'No tax ID' },
  { value: 'gb_vat', label: 'UK VAT' },
  { value: 'eu_vat', label: 'EU VAT' },
  { value: 'us_ein', label: 'US EIN' },
  { value: 'au_abn', label: 'Australia ABN' },
  { value: 'ca_bn', label: 'Canada BN' },
  { value: 'nz_gst', label: 'New Zealand GST' },
  { value: 'sg_gst', label: 'Singapore GST' },
  { value: 'sg_uen', label: 'Singapore UEN' },
] as const;

export const billingCountries = [
  { value: 'none', label: 'No country' },
  { value: 'AU', label: 'Australia' },
  { value: 'AT', label: 'Austria' },
  { value: 'BE', label: 'Belgium' },
  { value: 'BR', label: 'Brazil' },
  { value: 'CA', label: 'Canada' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'IN', label: 'India' },
  { value: 'IE', label: 'Ireland' },
  { value: 'IT', label: 'Italy' },
  { value: 'JP', label: 'Japan' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'NO', label: 'Norway' },
  { value: 'PT', label: 'Portugal' },
  { value: 'SG', label: 'Singapore' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'ES', label: 'Spain' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
] as const;

const taxIdTypeValues = taxIdTypes.map((type) => type.value) as [
  string,
  ...string[],
];

export const billingPreferencesSchema = z
  .object({
    companyName: z.string().trim().min(1, 'Company name is required').max(150),
    billingEmail: z.string().trim().email('Enter a valid billing email').max(512),
    purchaseOrder: z.string().trim().max(140).optional(),
    addressLine1: z.string().trim().max(200).optional(),
    addressLine2: z.string().trim().max(200).optional(),
    addressCity: z.string().trim().max(100).optional(),
    addressState: z.string().trim().max(100).optional(),
    addressPostalCode: z.string().trim().max(32).optional(),
    addressCountry: z
      .string()
      .trim()
      .transform((value) => {
        const normalizedValue = value.toUpperCase();
        return normalizedValue === 'NONE' ? '' : normalizedValue;
      })
      .refine((value) => value === '' || /^[A-Z]{2}$/.test(value), {
        message: 'Use a 2-letter country code',
      }),
    taxIdType: z.enum(taxIdTypeValues),
    taxIdValue: z.string().trim().max(64).optional(),
  })
  .refine((value) => value.taxIdType === 'none' || !!value.taxIdValue, {
    message: 'Enter the tax ID value',
    path: ['taxIdValue'],
  })
  .refine((value) => value.taxIdType !== 'none' || !value.taxIdValue, {
    message: 'Choose the tax ID type',
    path: ['taxIdType'],
  });

export type BillingPreferencesFormValues = z.infer<typeof billingPreferencesSchema>;

export function toBillingPreferencesFormValues(
  preferences: BillingPreferences | null,
): BillingPreferencesFormValues {
  return {
    companyName: preferences?.companyName ?? '',
    billingEmail: preferences?.billingEmail ?? '',
    purchaseOrder: preferences?.purchaseOrder ?? '',
    addressLine1: preferences?.address.line1 ?? '',
    addressLine2: preferences?.address.line2 ?? '',
    addressCity: preferences?.address.city ?? '',
    addressState: preferences?.address.state ?? '',
    addressPostalCode: preferences?.address.postalCode ?? '',
    addressCountry: preferences?.address.country?.toUpperCase() ?? '',
    taxIdType: preferences?.taxId?.type ?? 'none',
    taxIdValue: preferences?.taxId?.value ?? '',
  };
}

export function toBillingPreferencesPayload(values: BillingPreferencesFormValues) {
  return {
    companyName: values.companyName,
    billingEmail: values.billingEmail,
    purchaseOrder: values.purchaseOrder ?? '',
    addressLine1: values.addressLine1 ?? '',
    addressLine2: values.addressLine2 ?? '',
    addressCity: values.addressCity ?? '',
    addressState: values.addressState ?? '',
    addressPostalCode: values.addressPostalCode ?? '',
    addressCountry: values.addressCountry ?? '',
    taxIdType: values.taxIdType === 'none' ? '' : values.taxIdType,
    taxIdValue: values.taxIdValue ?? '',
  };
}

export function getTaxIdTypeLabel(value: string) {
  return taxIdTypes.find((type) => type.value === value)?.label ?? value;
}

export function getCountryLabel(value: string) {
  if (!value) return 'No country';
  const normalizedValue = value.toUpperCase();
  const country = billingCountries.find((item) => item.value === normalizedValue);
  return country ? `${country.label} (${country.value})` : normalizedValue;
}

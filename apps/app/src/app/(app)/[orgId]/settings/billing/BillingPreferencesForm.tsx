'use client';

import { apiClient } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from '@trycompai/design-system';
import type React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { BackgroundCheckBillingStatus, BillingPreferences } from './types';
import {
  billingCountries,
  billingPreferencesSchema,
  getCountryLabel,
  getTaxIdTypeLabel,
  taxIdTypes,
  toBillingPreferencesFormValues,
  toBillingPreferencesPayload,
  type BillingPreferencesFormValues,
} from './billingPreferencesFormSchema';

interface BillingPreferencesFormProps {
  organizationId: string;
  preferences: BillingPreferences | null;
  disabled: boolean;
  onSaved: (status: BackgroundCheckBillingStatus) => void;
}

export function BillingPreferencesForm({
  organizationId,
  preferences,
  disabled,
  onSaved,
}: BillingPreferencesFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<BillingPreferencesFormValues>({
    resolver: zodResolver(billingPreferencesSchema),
    values: toBillingPreferencesFormValues(preferences),
  });

  const handleSave = handleSubmit(async (values) => {
    const response = await apiClient.put<BackgroundCheckBillingStatus>(
      '/v1/billing/preferences',
      toBillingPreferencesPayload(values),
      organizationId,
    );

    if (response.error || !response.data) {
      toast.error(response.error ?? 'Failed to save billing preferences');
      return;
    }

    onSaved(response.data);
    reset(toBillingPreferencesFormValues(response.data.preferences ?? null));
    toast.success('Billing preferences saved');
  });

  return (
    <form onSubmit={handleSave}>
      <Card
        width="full"
        title="Business details"
        description="These details appear on future invoices."
        footer={
          <>
            <Text size="sm" variant="muted">
              Future invoice emails are sent to the billing email above.
            </Text>
            <Button
              type="submit"
              variant="default"
              disabled={disabled || isSubmitting || !isDirty}
              loading={isSubmitting}
            >
              Save billing preferences
            </Button>
          </>
        }
      >
        <Stack gap="6">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              id="billing-company-name"
              label="Legal company name"
              error={errors.companyName?.message}
            >
              <Input
                id="billing-company-name"
                disabled={disabled}
                aria-invalid={!!errors.companyName}
                {...register('companyName')}
              />
            </FormField>
            <FormField
              id="billing-email"
              label="Billing email"
              error={errors.billingEmail?.message}
            >
              <Input
                id="billing-email"
                type="email"
                disabled={disabled}
                aria-invalid={!!errors.billingEmail}
                {...register('billingEmail')}
              />
            </FormField>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              id="billing-address-line-1"
              label="Address line 1"
              error={errors.addressLine1?.message}
            >
              <Input
                id="billing-address-line-1"
                disabled={disabled}
                aria-invalid={!!errors.addressLine1}
                {...register('addressLine1')}
              />
            </FormField>
            <FormField
              id="billing-address-line-2"
              label="Address line 2"
              error={errors.addressLine2?.message}
            >
              <Input
                id="billing-address-line-2"
                disabled={disabled}
                aria-invalid={!!errors.addressLine2}
                {...register('addressLine2')}
              />
            </FormField>
            <FormField id="billing-city" label="City" error={errors.addressCity?.message}>
              <Input
                id="billing-city"
                disabled={disabled}
                aria-invalid={!!errors.addressCity}
                {...register('addressCity')}
              />
            </FormField>
            <FormField
              id="billing-state"
              label="State / county"
              error={errors.addressState?.message}
            >
              <Input
                id="billing-state"
                disabled={disabled}
                aria-invalid={!!errors.addressState}
                {...register('addressState')}
              />
            </FormField>
            <FormField
              id="billing-postal-code"
              label="Postcode / ZIP"
              error={errors.addressPostalCode?.message}
            >
              <Input
                id="billing-postal-code"
                disabled={disabled}
                aria-invalid={!!errors.addressPostalCode}
                {...register('addressPostalCode')}
              />
            </FormField>
            <FormField
              id="billing-country"
              label="Country code"
              error={errors.addressCountry?.message}
            >
              <Controller
                control={control}
                name="addressCountry"
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                    disabled={disabled}
                  >
                    <SelectTrigger id="billing-country" aria-invalid={!!errors.addressCountry}>
                      <SelectValue>{getCountryLabel(field.value)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      {billingCountries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.value === 'none'
                            ? country.label
                            : `${country.label} (${country.value})`}
                        </SelectItem>
                      ))}
                      {field.value &&
                        !billingCountries.some((country) => country.value === field.value) && (
                          <SelectItem value={field.value}>{field.value}</SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <FormField id="billing-tax-id-type" label="Tax ID type" error={errors.taxIdType?.message}>
              <Controller
                control={control}
                name="taxIdType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    disabled={disabled}
                  >
                    <SelectTrigger aria-invalid={!!errors.taxIdType}>
                      <SelectValue>{getTaxIdTypeLabel(field.value)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      {taxIdTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField id="billing-tax-id-value" label="Tax ID" error={errors.taxIdValue?.message}>
              <Input
                id="billing-tax-id-value"
                disabled={disabled}
                aria-invalid={!!errors.taxIdValue}
                {...register('taxIdValue')}
              />
            </FormField>
            <FormField
              id="billing-purchase-order"
              label="PO / reference"
              error={errors.purchaseOrder?.message}
            >
              <Input
                id="billing-purchase-order"
                disabled={disabled}
                aria-invalid={!!errors.purchaseOrder}
                {...register('purchaseOrder')}
              />
            </FormField>
          </div>

        </Stack>
      </Card>
    </form>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <Text size="xs" variant="destructive">
          {error}
        </Text>
      )}
    </Stack>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Textarea,
} from '@trycompai/design-system';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminBillingStatus } from './AdminBillingTypes';

const creditSchema = z.object({
  productKey: z.enum(['pentest', 'background_check']),
  quantity: z.number().int().min(1).max(1000),
  note: z.string().min(3).max(500),
  confirm: z.string().optional(),
});

export type CreditFormValues = z.infer<typeof creditSchema>;

export function CreditGrantForm({
  onSubmit,
  loading,
}: {
  onSubmit: (values: CreditFormValues) => Promise<void>;
  loading: boolean;
}) {
  const form = useForm<CreditFormValues>({
    resolver: zodResolver(creditSchema),
    defaultValues: {
      productKey: 'pentest',
      quantity: 1,
      note: '',
      confirm: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset({
      productKey: values.productKey,
      quantity: 1,
      note: '',
      confirm: '',
    });
  });

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_120px_1.5fr_140px]">
      <Controller
        control={form.control}
        name="productKey"
        render={({ field }) => (
          <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
            <SelectTrigger>
              <span>{field.value === 'pentest' ? 'Pentest' : 'Background checks'}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pentest">Pentest</SelectItem>
              <SelectItem value="background_check">Background checks</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      <Input
        type="number"
        min={1}
        max={1000}
        {...form.register('quantity', { valueAsNumber: true })}
      />
      <Input placeholder="Reason for grant" {...form.register('note')} />
      <Button type="submit" loading={loading} disabled={loading}>
        Grant credits
      </Button>
      <div className="md:col-span-4">
        <Input
          placeholder='Type "grant credits" for grants of 25 or more'
          {...form.register('confirm')}
        />
      </div>
    </form>
  );
}

const preferenceSchema = z.object({
  companyName: z.string().min(1).max(150),
  billingEmail: z.string().email(),
  purchaseOrder: z.string().max(140).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(100).optional(),
  addressPostalCode: z.string().max(32).optional(),
  addressCountry: z.string().max(2).optional(),
  taxIdType: z.string().optional(),
  taxIdValue: z.string().max(64).optional(),
  confirmBillingEmailChange: z.boolean().optional(),
  note: z.string().min(3).max(500),
});

export type PreferenceFormValues = z.infer<typeof preferenceSchema>;

export function BillingPreferencesAdminForm({
  status,
  onSubmit,
  loading,
}: {
  status: AdminBillingStatus;
  onSubmit: (values: PreferenceFormValues) => Promise<void>;
  loading: boolean;
}) {
  const form = useForm<PreferenceFormValues>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: {
      companyName: status.preferences.companyName ?? '',
      billingEmail: status.preferences.billingEmail ?? '',
      purchaseOrder: status.preferences.purchaseOrder ?? '',
      addressLine1: status.preferences.address.line1 ?? '',
      addressLine2: status.preferences.address.line2 ?? '',
      addressCity: status.preferences.address.city ?? '',
      addressState: status.preferences.address.state ?? '',
      addressPostalCode: status.preferences.address.postalCode ?? '',
      addressCountry: status.preferences.address.country ?? '',
      taxIdType: status.preferences.taxId?.type ?? '',
      taxIdValue: status.preferences.taxId?.value ?? '',
      confirmBillingEmailChange: false,
      note: '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
      <Input placeholder="Company name" {...form.register('companyName')} />
      <Input placeholder="Billing email" {...form.register('billingEmail')} />
      <Input placeholder="PO / reference" {...form.register('purchaseOrder')} />
      <Input placeholder="Country" maxLength={2} {...form.register('addressCountry')} />
      <Input placeholder="Address line 1" {...form.register('addressLine1')} />
      <Input placeholder="Address line 2" {...form.register('addressLine2')} />
      <Input placeholder="City" {...form.register('addressCity')} />
      <Input placeholder="State" {...form.register('addressState')} />
      <Input placeholder="Postal code" {...form.register('addressPostalCode')} />
      <Input placeholder="Tax ID type" {...form.register('taxIdType')} />
      <Input placeholder="Tax ID value" {...form.register('taxIdValue')} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register('confirmBillingEmailChange')} />
        Confirm billing email recipient change
      </label>
      <div className="md:col-span-2">
        <Textarea placeholder="Reason for update" rows={3} {...form.register('note')} />
      </div>
      <div>
        <Button type="submit" loading={loading} disabled={loading}>
          Save billing details
        </Button>
      </div>
    </form>
  );
}

const planSchema = z.object({
  skuKey: z.string().min(1),
  note: z.string().min(3).max(500),
  confirmDowngrade: z.boolean().optional(),
});

export type PlanFormValues = z.infer<typeof planSchema>;

export function PlanChangeForm({
  status,
  loading,
  onSubmit,
}: {
  status: AdminBillingStatus;
  loading: boolean;
  onSubmit: (values: PlanFormValues) => Promise<void>;
}) {
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      skuKey: status.availablePlans[0]?.skuKey ?? '',
      note: '',
      confirmDowngrade: false,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto]"
    >
      <Controller
        control={form.control}
        name="skuKey"
        render={({ field }) => (
          <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
            <SelectTrigger>
              <span>{getPlanLabel(status, field.value)}</span>
            </SelectTrigger>
            <SelectContent>
              {status.availablePlans.map((plan) => (
                <SelectItem key={plan.skuKey} value={plan.skuKey}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <Input placeholder="Reason for subscription change" {...form.register('note')} />
      <Button type="submit" loading={loading} disabled={loading}>
        Apply plan
      </Button>
      <label className="flex items-center gap-2 text-sm md:col-span-3">
        <input type="checkbox" {...form.register('confirmDowngrade')} />
        Confirm downgrade if this reduces monthly allowance
      </label>
    </form>
  );
}

function getPlanLabel(status: AdminBillingStatus, skuKey: string) {
  return status.availablePlans.find((plan) => plan.skuKey === skuKey)?.name ?? 'Select plan';
}

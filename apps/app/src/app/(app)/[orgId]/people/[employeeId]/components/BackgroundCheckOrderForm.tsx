'use client';

import { Button, Input, Textarea } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import {
  FormFooterInfo,
  FormFooterRow,
  LabelRow,
} from './BackgroundCheckFormHelpers';

export interface OrderFormValues {
  employeeName: string;
  employeeEmail: string;
  requesterNotes: string;
}

interface OrderFormProps {
  values: OrderFormValues;
  errors: Partial<Record<keyof OrderFormValues, string>>;
  onChange: (next: OrderFormValues) => void;
  onSubmit: () => void;
  onBack?: () => void;
  submitting: boolean;
  canSubmit: boolean;
  disabledReason?: string;
}

export function BackgroundCheckOrderForm({
  values,
  errors,
  onChange,
  onSubmit,
  onBack,
  submitting,
  canSubmit,
  disabledReason,
}: OrderFormProps) {
  const setField = <K extends keyof OrderFormValues>(key: K, value: OrderFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <LabelRow htmlFor="bg-order-name" required>
            Employee name
          </LabelRow>
          <Input
            id="bg-order-name"
            value={values.employeeName}
            onChange={(event) => setField('employeeName', event.target.value)}
            aria-invalid={Boolean(errors.employeeName) || undefined}
          />
          {errors.employeeName && (
            <p className="mt-1 text-xs text-destructive">{errors.employeeName}</p>
          )}
        </div>
        <div>
          <LabelRow
            htmlFor="bg-order-email"
            required
            hint="Where the candidate will receive the consent form"
          >
            Personal email
          </LabelRow>
          <Input
            id="bg-order-email"
            type="email"
            placeholder="name@personal.com"
            value={values.employeeEmail}
            onChange={(event) => setField('employeeEmail', event.target.value)}
            aria-invalid={Boolean(errors.employeeEmail) || undefined}
          />
          {errors.employeeEmail && (
            <p className="mt-1 text-xs text-destructive">{errors.employeeEmail}</p>
          )}
        </div>
      </div>
      <div className="mb-4">
        <LabelRow htmlFor="bg-order-notes" hint="Not sent to candidate">
          Internal notes
        </LabelRow>
        <Textarea
          id="bg-order-notes"
          rows={3}
          placeholder="e.g. expedite for Nov 26 audit window"
          value={values.requesterNotes}
          onChange={(event) => setField('requesterNotes', event.target.value)}
        />
      </div>
      <FormFooterRow
        info={
          <FormFooterInfo>
            The candidate will receive an email to consent and submit their information.
          </FormFooterInfo>
        }
      >
        {onBack && (
          <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={submitting}>
            Back
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          loading={submitting}
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
          iconRight={<ArrowRight size={12} />}
          title={!canSubmit ? disabledReason : undefined}
        >
          Send invite
        </Button>
      </FormFooterRow>
    </form>
  );
}

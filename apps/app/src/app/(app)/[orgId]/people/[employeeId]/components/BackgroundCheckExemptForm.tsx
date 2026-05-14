'use client';

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Warning } from '@trycompai/design-system/icons';
import { FormFooterRow, LabelRow } from './BackgroundCheckFormHelpers';

export const EXEMPT_REASONS = [
  {
    value: 'contractor_with_vendor_check',
    label: 'Contractor with vendor-provided check',
  },
  {
    value: 'pre_existing_employee',
    label: 'Pre-existing employee (grandfathered)',
  },
  {
    value: 'role_does_not_require',
    label: 'Role does not require check per policy',
  },
  {
    value: 'local_law_prohibits',
    label: 'Local law prohibits check',
  },
  {
    value: 'other',
    label: 'Other (provide justification)',
  },
] as const;

export interface ExemptFormValues {
  reason: string;
  justification: string;
}

interface ExemptFormProps {
  values: ExemptFormValues;
  onChange: (next: ExemptFormValues) => void;
  onSubmit: () => void;
  onBack?: () => void;
  submitting: boolean;
  canSubmit: boolean;
}

export function BackgroundCheckExemptForm({
  values,
  onChange,
  onSubmit,
  onBack,
  submitting,
  canSubmit,
}: ExemptFormProps) {
  const setField = <K extends keyof ExemptFormValues>(key: K, value: ExemptFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <div
        className="mb-4 flex items-start gap-2.5 rounded-[var(--radius)] border px-3.5 py-3"
        style={{
          borderColor: 'oklch(0.93 0.06 85)',
          backgroundColor: 'oklch(0.99 0.03 90)',
        }}
      >
        <span className="mt-0.5 text-[var(--warning)]">
          <Warning size={16} />
        </span>
        <Stack gap="0">
          <Text size="sm" weight="medium">
            Exemptions create a compliance exception
          </Text>
          <Text size="xs" variant="muted">
            This will appear in your audit trail. SOC 2 auditors may ask you to justify exemptions
            during review.
          </Text>
        </Stack>
      </div>

      <div className="mb-4">
        <LabelRow htmlFor="bg-exempt-reason" required>
          Reason for exemption
        </LabelRow>
        <Select
          value={values.reason}
          onValueChange={(next) => setField('reason', next ?? '')}
        >
          <SelectTrigger id="bg-exempt-reason">
            <SelectValue placeholder="Select a reason…" />
          </SelectTrigger>
          <SelectContent>
            {EXEMPT_REASONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <LabelRow htmlFor="bg-exempt-justification" hint="Will be attached to the audit log">
          Justification
        </LabelRow>
        <Textarea
          id="bg-exempt-justification"
          rows={3}
          placeholder="e.g. Contractor with existing background check on file from staffing agency."
          value={values.justification}
          onChange={(event) => setField('justification', event.target.value)}
        />
      </div>

      <FormFooterRow align="end">
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
        >
          Confirm exemption
        </Button>
      </FormFooterRow>
    </form>
  );
}

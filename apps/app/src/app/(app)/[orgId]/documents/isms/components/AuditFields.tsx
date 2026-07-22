'use client';

import {
  Field,
  FieldError,
  Grid,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import type { AuditDetailsFormValues } from './audit-schema';
import {
  AUDIT_STATUSES,
  AUDIT_STATUS_LABELS,
  CONCLUSION_VERDICTS,
  CONCLUSION_VERDICT_LABELS,
} from './internal-audit-constants';
import { IsmsFieldLabel } from './shared';

const NO_VERDICT = 'no-verdict';

interface AuditFieldsProps {
  control: Control<AuditDetailsFormValues>;
  /** Internal Auditor holder(s) from ISMS > Roles (5.3). */
  auditorOptions: string[];
}

/**
 * The auditor picker: whoever ISMS > Roles says the Internal Auditor is — a
 * member or an external firm. The current stored value stays selectable even
 * if Roles has since changed (the audit is a historical record). When Roles
 * has no Internal Auditor yet, the select is disabled with a pointer.
 */
function AuditorSelect({
  value,
  onChange,
  auditorOptions,
}: {
  value: string;
  onChange: (value: string) => void;
  auditorOptions: string[];
}) {
  const options = [...new Set([...auditorOptions, ...(value ? [value] : [])])];
  if (options.length === 0) {
    return (
      <Stack gap="1">
        <Select disabled value={undefined}>
          <SelectTrigger aria-label="Auditor">
            <SelectValue placeholder="No Internal Auditor assigned" />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <Text size="xs" variant="muted">
          Assign the Internal Auditor under ISMS &gt; Roles first.
        </Text>
      </Stack>
    );
  }
  return (
    <Select value={value || undefined} onValueChange={(next) => onChange(next ?? '')}>
      <SelectTrigger aria-label="Auditor">
        <SelectValue placeholder="Select the auditor" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Inline edit fields for an audit instance's plan + conclusion (clause 9.2). */
export function AuditFields({ control, auditorOptions }: AuditFieldsProps) {
  return (
    <Stack gap="3">
      <IsmsFieldLabel label="Scope">
        <Field>
          <Controller
            control={control}
            name="scope"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Textarea {...field} rows={2} aria-label="Audit scope" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Criteria">
        <Field>
          <Controller
            control={control}
            name="criteria"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Textarea {...field} rows={2} aria-label="Audit criteria" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <IsmsFieldLabel label="Auditor">
          <Controller
            control={control}
            name="auditorName"
            render={({ field }) => (
              <AuditorSelect
                value={field.value}
                onChange={field.onChange}
                auditorOptions={auditorOptions}
              />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Audit status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {AUDIT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Planned start date">
          <Controller
            control={control}
            name="plannedStartDate"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} type="date" aria-label="Planned start date" />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Planned end date">
          <Field>
            <Controller
              control={control}
              name="plannedEndDate"
              render={({ field: { ref: _ref, ...field }, fieldState }) => (
                <>
                  <Input {...field} type="date" aria-label="Planned end date" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </>
              )}
            />
          </Field>
        </IsmsFieldLabel>
      </Grid>
      <IsmsFieldLabel label="Conclusion — overall, this audit found the ISMS to ...">
        <Controller
          control={control}
          name="conclusionVerdict"
          render={({ field }) => (
            <Select
              value={field.value || NO_VERDICT}
              onValueChange={(next) =>
                field.onChange(next === NO_VERDICT ? '' : next)
              }
            >
              <SelectTrigger aria-label="Conclusion verdict">
                <SelectValue placeholder="No verdict yet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_VERDICT}>No verdict yet</SelectItem>
                {CONCLUSION_VERDICTS.map((verdict) => (
                  <SelectItem key={verdict} value={verdict}>
                    {CONCLUSION_VERDICT_LABELS[verdict]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Conclusion narrative (optional)">
        <Controller
          control={control}
          name="conclusionNotes"
          render={({ field: { ref: _ref, ...field } }) => (
            <Textarea
              {...field}
              rows={2}
              aria-label="Conclusion narrative"
              placeholder="Optional narrative added after the rendered conclusion sentence."
            />
          )}
        />
      </IsmsFieldLabel>
    </Stack>
  );
}

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
  Textarea,
} from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import type { ApproverOption } from './IsmsApprovalSection';
import type { MetricFormValues } from './metric-schema';
import {
  METRIC_CADENCES,
  METRIC_CADENCE_LABELS,
} from './monitoring-constants';
import { IsmsFieldLabel } from './shared';

interface MetricFieldsProps {
  control: Control<MetricFormValues>;
  memberOptions: ApproverOption[];
  /** Custom metrics may rename themselves; seeded metric names stay fixed. */
  showName: boolean;
}

/** "Who monitors" / "Who analyses" picker; empty = defaults to the SPO. */
function MemberSelect({
  value,
  onChange,
  label,
  memberOptions,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  memberOptions: ApproverOption[];
}) {
  return (
    <Select
      value={value || 'spo-default'}
      onValueChange={(next) => onChange(!next || next === 'spo-default' ? '' : next)}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder="Security & Privacy Owner (default)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="spo-default">
          Security &amp; Privacy Owner (default)
        </SelectItem>
        {memberOptions.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Inline edit fields for a monitoring metric (clause 9.1). Shared by the add
 * form (MonitoringForm) and the row editor (MonitoringRow) so both edit the
 * same field set with one schema.
 */
export function MetricFields({ control, memberOptions, showName }: MetricFieldsProps) {
  return (
    <Stack gap="3">
      {showName ? (
        <IsmsFieldLabel label="Name">
          <Field>
            <Controller
              control={control}
              name="name"
              render={({ field: { ref: _ref, ...field }, fieldState }) => (
                <>
                  <Input {...field} aria-label="Metric name" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </>
              )}
            />
          </Field>
        </IsmsFieldLabel>
      ) : null}
      <IsmsFieldLabel label="What is measured">
        <Controller
          control={control}
          name="whatIsMeasured"
          render={({ field: { ref: _ref, ...field } }) => (
            <Textarea {...field} rows={2} aria-label="What is measured" />
          )}
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Method">
        <Controller
          control={control}
          name="method"
          render={({ field: { ref: _ref, ...field } }) => (
            <Textarea
              {...field}
              rows={2}
              aria-label="Method (how the value is derived)"
            />
          )}
        />
      </IsmsFieldLabel>
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <IsmsFieldLabel label="Cadence">
          <Controller
            control={control}
            name="cadence"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Metric cadence">
                  <SelectValue placeholder="Select cadence" />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_CADENCES.map((cadence) => (
                    <SelectItem key={cadence} value={cadence}>
                      {METRIC_CADENCE_LABELS[cadence]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Target">
          <Controller
            control={control}
            name="target"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} aria-label="Metric target" />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Who monitors">
          <Controller
            control={control}
            name="monitorMemberId"
            render={({ field }) => (
              <MemberSelect
                value={field.value}
                onChange={field.onChange}
                label="Who monitors"
                memberOptions={memberOptions}
              />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Who analyses">
          <Controller
            control={control}
            name="analyzeMemberId"
            render={({ field }) => (
              <MemberSelect
                value={field.value}
                onChange={field.onChange}
                label="Who analyses"
                memberOptions={memberOptions}
              />
            )}
          />
        </IsmsFieldLabel>
      </Grid>
    </Stack>
  );
}

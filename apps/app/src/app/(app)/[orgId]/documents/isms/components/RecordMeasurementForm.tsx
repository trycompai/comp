'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Field,
  FieldError,
  Grid,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { IsmsMetric } from '../isms-types';
import {
  addPeriods,
  periodLabel,
  periodStartFor,
} from './monitoring-periods';

const recordSchema = z.object({
  periodStart: z.string().min(1, 'Pick a period'),
  value: z.string().trim().min(1, 'Value is required'),
  note: z.string(),
});

export type RecordMeasurementValues = z.infer<typeof recordSchema>;

/** How far back the manual period picker reaches (2 years of months). */
const PICKER_PERIODS = 24;

interface RecordMeasurementFormProps {
  metric: IsmsMetric;
  onRecord: (values: RecordMeasurementValues) => Promise<void>;
}

/**
 * Manual single-measurement entry: any past-or-current period, so corrections
 * append a new timestamped record for an already-measured period (never an
 * overwrite). Bulk entry for due/overdue periods lives in MetricsDueCard.
 */
export function RecordMeasurementForm({ metric, onRecord }: RecordMeasurementFormProps) {
  const cadence = metric.cadence;
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<RecordMeasurementValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: { periodStart: '', value: '', note: '' },
  });

  if (!cadence) return null;

  const current = periodStartFor(cadence, new Date());
  const periods = Array.from({ length: PICKER_PERIODS }, (_, index) =>
    addPeriods(cadence, current, -index),
  );

  const handleRecord = handleSubmit(async (values) => {
    try {
      await onRecord(values);
    } catch {
      // Keep the user's input when the save fails.
      return;
    }
    reset({ periodStart: '', value: '', note: '' });
  });

  return (
    <form onSubmit={handleRecord}>
      <Grid cols={{ base: '1', md: '4' }} gap="2">
        <Controller
          control={control}
          name="periodStart"
          render={({ field }) => (
            <Field>
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Period covered">
                  <SelectValue placeholder="Period covered" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((key) => (
                    <SelectItem key={key} value={key}>
                      {periodLabel(cadence, key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.periodStart?.message}</FieldError>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="value"
          render={({ field: { ref: _ref, ...field } }) => (
            <Field>
              <Input {...field} placeholder="Value" aria-label="Measurement value" />
              <FieldError>{errors.value?.message}</FieldError>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="note"
          render={({ field: { ref: _ref, ...field } }) => (
            <Input
              {...field}
              placeholder="Note (optional)"
              aria-label="Measurement note"
            />
          )}
        />
        <div>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            loading={isSubmitting}
            disabled={isSubmitting}
            iconLeft={<Add size={16} />}
          >
            Record
          </Button>
        </div>
      </Grid>
    </form>
  );
}

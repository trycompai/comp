'use client';

import {
  Badge,
  Button,
  Grid,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Controller, useForm } from 'react-hook-form';
import type { DueEntry } from './monitoring-constants';

export interface DueMeasurementRow {
  metricId: string;
  periodStart: string;
  value: string;
}

interface MetricsDueCardProps {
  entries: DueEntry[];
  /** Show the metric name per row (hidden in per-metric backfill). */
  showMetricName: boolean;
  onSaveAll: (rows: DueMeasurementRow[]) => Promise<void>;
}

interface DueFormValues {
  rows: Array<{ value: string }>;
}

/**
 * The one-save bulk-entry grid (CS-723): one row per metric × missing period
 * — current periods ("due") and past gaps ("overdue") together, so the same
 * component serves the "Metrics due" view and per-metric / cross-metric
 * backfill. Only filled rows are submitted, in a single transactional save.
 *
 * The parent MUST key this component by the entry list's identity so the form
 * re-initializes when a save shrinks the list.
 */
export function MetricsDueCard({ entries, showMetricName, onSaveAll }: MetricsDueCardProps) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<DueFormValues>({
    defaultValues: { rows: entries.map(() => ({ value: '' })) },
  });

  const rows = watch('rows');
  const filledCount = rows.filter((row) => row.value.trim()).length;

  const handleSave = handleSubmit(async (values) => {
    const filled: DueMeasurementRow[] = [];
    values.rows.forEach((row, index) => {
      const entry = entries[index];
      if (!entry || !row.value.trim()) return;
      filled.push({
        metricId: entry.metric.id,
        periodStart: entry.periodKey,
        value: row.value.trim(),
      });
    });
    if (filled.length === 0) return;
    try {
      await onSaveAll(filled);
    } catch {
      // Keep the user's input when the save fails (error toasted by caller).
    }
  });

  if (entries.length === 0) {
    return (
      <Text size="sm" variant="muted">
        All caught up — every active metric has a value for its current period.
      </Text>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <Stack gap="3">
        {entries.map((entry, index) => (
          <Grid
            key={`${entry.metric.id}:${entry.periodKey}`}
            cols={{ base: '1', md: '3' }}
            gap="2"
          >
            <Stack gap="1">
              {showMetricName ? (
                <Heading level="5">{entry.metric.name}</Heading>
              ) : null}
              <HStack align="center" gap="2">
                <Text size="sm" variant="muted">
                  {entry.periodText}
                </Text>
                {entry.isCurrentPeriod ? (
                  <Badge variant="secondary">Due</Badge>
                ) : (
                  <Badge variant="destructive">Overdue</Badge>
                )}
              </HStack>
            </Stack>
            <Controller
              control={control}
              name={`rows.${index}.value`}
              render={({ field: { ref: _ref, ...field } }) => (
                <Input
                  {...field}
                  aria-label={`Value for ${entry.metric.name}, ${entry.periodText}`}
                  placeholder="Value"
                />
              )}
            />
            <HStack justify="start">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={entry.lastValue === null || isSubmitting}
                onClick={() =>
                  entry.lastValue !== null &&
                  setValue(`rows.${index}.value`, entry.lastValue, {
                    shouldDirty: true,
                  })
                }
              >
                Same as last period
                {entry.lastValue !== null ? ` (${entry.lastValue})` : ''}
              </Button>
            </HStack>
          </Grid>
        ))}
        <HStack justify="end" align="center" gap="3">
          <Text size="sm" variant="muted">
            {filledCount} of {entries.length} filled
          </Text>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={filledCount === 0 || isSubmitting}
            loading={isSubmitting}
          >
            Save {filledCount > 0 ? `${filledCount} ` : ''}measurement
            {filledCount === 1 ? '' : 's'}
          </Button>
        </HStack>
      </Stack>
    </form>
  );
}

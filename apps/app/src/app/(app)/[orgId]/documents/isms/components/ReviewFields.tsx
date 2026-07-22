'use client';

import {
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
import {
  REVIEW_CONCLUSION_VERDICTS,
  REVIEW_CONCLUSION_VERDICT_LABELS,
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS,
} from './management-review-constants';
import type { ReviewDetailsFormValues } from './management-review-schema';
import { IsmsFieldLabel } from './shared';

const NO_VERDICT = 'no-verdict';

interface ReviewFieldsProps {
  control: Control<ReviewDetailsFormValues>;
  /** Top Management holder(s) from ISMS > Roles (5.3). */
  chairOptions: string[];
}

/**
 * The chair picker: whoever ISMS > Roles says Top Management is. The current
 * stored value stays selectable even if Roles has since changed (the review
 * is a historical record). When Roles has no Top Management holder yet, the
 * select is disabled with a pointer.
 */
function ChairSelect({
  value,
  onChange,
  chairOptions,
}: {
  value: string;
  onChange: (value: string) => void;
  chairOptions: string[];
}) {
  const options = [...new Set([...chairOptions, ...(value ? [value] : [])])];
  if (options.length === 0) {
    return (
      <Stack gap="1">
        <Select disabled value={undefined}>
          <SelectTrigger aria-label="Chair">
            <SelectValue placeholder="No Top Management holder assigned" />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <Text size="xs" variant="muted">
          Assign Top Management under ISMS &gt; Roles first.
        </Text>
      </Stack>
    );
  }
  return (
    <Select value={value || undefined} onValueChange={(next) => onChange(next ?? '')}>
      <SelectTrigger aria-label="Chair">
        <SelectValue placeholder="Select the chair" />
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

/** Inline edit fields for a review instance's details + conclusion (clause 9.3). */
export function ReviewFields({ control, chairOptions }: ReviewFieldsProps) {
  return (
    <Stack gap="3">
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <IsmsFieldLabel label="Meeting date — when the review was held (can be backdated)">
          <Controller
            control={control}
            name="meetingDate"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} type="date" aria-label="Meeting date" />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Review status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {REVIEW_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </IsmsFieldLabel>
      </Grid>
      <IsmsFieldLabel label="Chair">
        <Controller
          control={control}
          name="chairName"
          render={({ field }) => (
            <ChairSelect
              value={field.value}
              onChange={field.onChange}
              chairOptions={chairOptions}
            />
          )}
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Conclusion — overall, the ISMS was found to be ...">
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
                {REVIEW_CONCLUSION_VERDICTS.map((verdict) => (
                  <SelectItem key={verdict} value={verdict}>
                    {REVIEW_CONCLUSION_VERDICT_LABELS[verdict]}
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

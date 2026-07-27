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
import type { ObjectiveFormValues } from './objective-schema';
import { OBJECTIVE_STATUSES, OBJECTIVE_STATUS_LABELS } from './objectives-status';
import { IsmsFieldLabel } from './shared';

interface ObjectivesRowEditorProps {
  control: Control<ObjectiveFormValues>;
  ownerOptions: ApproverOption[];
}

/**
 * Inline edit form for a single objective card. Factored out of ObjectivesRow so
 * each file stays focused and under the line limit; uses RHF Controllers bound to
 * the row's form and only DS primitives.
 */
export function ObjectivesRowEditor({ control, ownerOptions }: ObjectivesRowEditorProps) {
  const hasOwnerOptions = ownerOptions.length > 0;

  return (
    <Stack gap="3">
      <IsmsFieldLabel label="Objective">
        <Field>
          <Controller
            control={control}
            name="objective"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Textarea {...field} rows={3} aria-label="Objective" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <IsmsFieldLabel label="Target">
          <Controller
            control={control}
            name="target"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} aria-label="Objective target" />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Owner">
          <Controller
            control={control}
            name="ownerMemberId"
            render={({ field }) =>
              hasOwnerOptions ? (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Objective owner">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  aria-label="Objective owner"
                />
              )
            }
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Cadence">
          <Controller
            control={control}
            name="cadence"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} aria-label="Objective cadence" />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Measurement">
          <Controller
            control={control}
            name="measurementMethod"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} aria-label="Objective measurement method" />
            )}
          />
        </IsmsFieldLabel>
      </Grid>
      <IsmsFieldLabel label="Plan">
        <Controller
          control={control}
          name="plan"
          render={({ field: { ref: _ref, ...field } }) => (
            <Textarea {...field} rows={3} aria-label="Objective plan" />
          )}
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Status">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-label="Objective status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {OBJECTIVE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {OBJECTIVE_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </IsmsFieldLabel>
    </Stack>
  );
}

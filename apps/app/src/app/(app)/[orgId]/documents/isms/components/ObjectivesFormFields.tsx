'use client';

import {
  Field,
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
import type { ObjectiveFormValues } from './ObjectivesForm';
import { OBJECTIVE_STATUSES, OBJECTIVE_STATUS_LABELS } from './objectives-status';
import { IsmsFieldLabel } from './shared';

interface ObjectivesFormFieldsProps {
  control: Control<ObjectiveFormValues>;
  ownerOptions: ApproverOption[];
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Field>
      <IsmsFieldLabel label={label}>{children}</IsmsFieldLabel>
    </Field>
  );
}

/**
 * The labelled field grid for the new-objective form, factored out of
 * ObjectivesForm to keep each file focused. DS primitives only.
 */
export function ObjectivesFormFields({ control, ownerOptions }: ObjectivesFormFieldsProps) {
  const hasOwnerOptions = ownerOptions.length > 0;

  return (
    <Stack gap="3">
      <FormField label="Objective">
        <Controller
          control={control}
          name="objective"
          render={({ field: { ref: _ref, ...field } }) => (
            <Textarea {...field} rows={2} placeholder="Objective" aria-label="New objective" />
          )}
        />
      </FormField>
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <FormField label="Target">
          <Controller
            control={control}
            name="target"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} placeholder="Target (e.g. 99.9%)" aria-label="New objective target" />
            )}
          />
        </FormField>
        <FormField label="Owner">
          <Controller
            control={control}
            name="ownerMemberId"
            render={({ field }) =>
              hasOwnerOptions ? (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="New objective owner">
                    <SelectValue placeholder="Select an owner" />
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
                  placeholder="Owner"
                  aria-label="New objective owner"
                />
              )
            }
          />
        </FormField>
        <FormField label="Cadence">
          <Controller
            control={control}
            name="cadence"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input
                {...field}
                placeholder="Cadence (e.g. Quarterly)"
                aria-label="New objective cadence"
              />
            )}
          />
        </FormField>
        <FormField label="Measurement">
          <Controller
            control={control}
            name="measurementMethod"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input
                {...field}
                placeholder="Measurement method"
                aria-label="New objective measurement method"
              />
            )}
          />
        </FormField>
      </Grid>
      <FormField label="Plan">
        <Controller
          control={control}
          name="plan"
          render={({ field: { ref: _ref, ...field } }) => (
            <Textarea {...field} rows={2} placeholder="Plan to achieve" aria-label="New objective plan" />
          )}
        />
      </FormField>
      <FormField label="Status">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-label="New objective status">
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
      </FormField>
    </Stack>
  );
}

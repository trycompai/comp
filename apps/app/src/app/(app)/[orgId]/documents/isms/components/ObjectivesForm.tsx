'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Field,
  FieldError,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { ApproverOption } from './IsmsApprovalSection';

const OBJECTIVE_STATUSES = ['not_started', 'on_track', 'at_risk', 'met'] as const;

export const OBJECTIVE_STATUS_LABELS: Record<(typeof OBJECTIVE_STATUSES)[number], string> = {
  not_started: 'Not started',
  on_track: 'On track',
  at_risk: 'At risk',
  met: 'Met',
};

const objectiveSchema = z.object({
  objective: z.string().min(1, 'Objective is required'),
  target: z.string(),
  ownerMemberId: z.string(),
  cadence: z.string(),
  plan: z.string(),
  measurementMethod: z.string(),
  status: z.enum(OBJECTIVE_STATUSES),
});

export type ObjectiveFormValues = z.infer<typeof objectiveSchema>;

interface ObjectivesFormProps {
  ownerOptions: ApproverOption[];
  onAdd: (values: ObjectiveFormValues) => Promise<void>;
}

export function ObjectivesForm({ ownerOptions, onAdd }: ObjectivesFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<ObjectiveFormValues>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      objective: '',
      target: '',
      ownerMemberId: '',
      cadence: '',
      plan: '',
      measurementMethod: '',
      status: 'not_started',
    },
  });

  const hasOwnerOptions = ownerOptions.length > 0;

  const handleAdd = handleSubmit(async (values) => {
    await onAdd(values);
    reset();
  });

  return (
    <form
      onSubmit={handleAdd}
      className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <Controller
            control={control}
            name="objective"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} placeholder="Objective" aria-label="New objective" />
            )}
          />
          <FieldError>{errors.objective?.message}</FieldError>
        </Field>
        <Field>
          <Controller
            control={control}
            name="target"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} placeholder="Target (e.g. 99.9%)" aria-label="New objective target" />
            )}
          />
        </Field>
        <Field>
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
        </Field>
        <Field>
          <Controller
            control={control}
            name="cadence"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} placeholder="Cadence (e.g. Quarterly)" aria-label="New objective cadence" />
            )}
          />
        </Field>
        <Field>
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
        </Field>
        <Field>
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
        </Field>
        <div className="md:col-span-2">
          <Field>
            <Controller
              control={control}
              name="plan"
              render={({ field: { ref: _ref, ...field } }) => (
                <Textarea {...field} rows={2} placeholder="Plan to achieve" aria-label="New objective plan" />
              )}
            />
          </Field>
        </div>
      </div>
      <HStack justify="end">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting}
          iconLeft={<Add size={16} />}
        >
          Add objective
        </Button>
      </HStack>
    </form>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, FieldError, HStack, Input, Textarea } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const requirementSchema = z.object({
  partyName: z.string().min(1, 'Interested party is required'),
  interestedPartyId: z.string().optional(),
  requirement: z.string().min(1, 'Requirement is required'),
  treatment: z.string().min(1, 'ISMS treatment is required'),
});

export type RequirementFormValues = z.infer<typeof requirementSchema>;

interface RequirementsFormProps {
  onAdd: (values: RequirementFormValues) => Promise<void>;
}

export function RequirementsForm({ onAdd }: RequirementsFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<RequirementFormValues>({
    resolver: zodResolver(requirementSchema),
    defaultValues: { partyName: '', interestedPartyId: '', requirement: '', treatment: '' },
  });

  const handleAdd = handleSubmit(async (values) => {
    await onAdd(values);
    reset({ partyName: '', interestedPartyId: '', requirement: '', treatment: '' });
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
            name="partyName"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} placeholder="Interested party" aria-label="New requirement party" />
            )}
          />
          <FieldError>{errors.partyName?.message}</FieldError>
        </Field>
        <Field>
          <Controller
            control={control}
            name="interestedPartyId"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input
                {...field}
                placeholder="Linked party ID (optional)"
                aria-label="New requirement party ID"
              />
            )}
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <Controller
            control={control}
            name="requirement"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder="Requirement relevant to information security"
                aria-label="New requirement description"
              />
            )}
          />
          <FieldError>{errors.requirement?.message}</FieldError>
        </Field>
        <Field>
          <Controller
            control={control}
            name="treatment"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder="How the ISMS addresses this requirement"
                aria-label="New requirement treatment"
              />
            )}
          />
          <FieldError>{errors.treatment?.message}</FieldError>
        </Field>
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
          Add requirement
        </Button>
      </HStack>
    </form>
  );
}

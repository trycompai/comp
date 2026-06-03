'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, FieldError, HStack, Input, Textarea } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { requirementSchema, type RequirementFormValues } from './requirement-schema';
import { IsmsAddCard } from './shared';

export type { RequirementFormValues };

interface RequirementsFormProps {
  onAdd: (values: RequirementFormValues) => Promise<void>;
}

export function RequirementsForm({ onAdd }: RequirementsFormProps) {
  return (
    <IsmsAddCard addLabel="Add requirement" formTitle="New requirement">
      {({ close }) => <RequirementsFields onAdd={onAdd} onClose={close} />}
    </IsmsAddCard>
  );
}

function RequirementsFields({
  onAdd,
  onClose,
}: RequirementsFormProps & { onClose: () => void }) {
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
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset({ partyName: '', interestedPartyId: '', requirement: '', treatment: '' });
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
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

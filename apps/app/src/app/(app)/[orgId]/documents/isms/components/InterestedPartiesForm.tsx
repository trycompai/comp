'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, FieldError, HStack, Input, Textarea } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import {
  interestedPartySchema,
  type InterestedPartyFormValues,
} from './interested-party-schema';
import { IsmsAddCard } from './shared';

interface InterestedPartiesFormProps {
  onAdd: (params: InterestedPartyFormValues) => Promise<void>;
}

export function InterestedPartiesForm({ onAdd }: InterestedPartiesFormProps) {
  return (
    <IsmsAddCard addLabel="Add interested party" formTitle="New interested party">
      {({ close }) => <InterestedPartiesFields onAdd={onAdd} onClose={close} />}
    </IsmsAddCard>
  );
}

function InterestedPartiesFields({
  onAdd,
  onClose,
}: InterestedPartiesFormProps & { onClose: () => void }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<InterestedPartyFormValues>({
    resolver: zodResolver(interestedPartySchema),
    defaultValues: { name: '', category: '', needsExpectations: '' },
  });

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset({ name: '', category: '', needsExpectations: '' });
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <Controller
            control={control}
            name="name"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} placeholder="Party name" aria-label="New interested party name" />
            )}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>
        <Field>
          <Controller
            control={control}
            name="category"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input
                {...field}
                placeholder="Category (e.g. Customer, Regulator)"
                aria-label="New interested party category"
              />
            )}
          />
          <FieldError>{errors.category?.message}</FieldError>
        </Field>
        <Field>
          <Controller
            control={control}
            name="needsExpectations"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder="Needs & expectations"
                aria-label="New interested party needs and expectations"
              />
            )}
          />
          <FieldError>{errors.needsExpectations?.message}</FieldError>
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
          Add interested party
        </Button>
      </HStack>
    </form>
  );
}

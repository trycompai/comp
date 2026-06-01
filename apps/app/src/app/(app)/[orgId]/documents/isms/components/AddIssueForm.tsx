'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, FieldError, HStack, Textarea } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { IsmsContextIssueKind } from '../isms-types';
import { IsmsAddCard } from './shared';

const addIssueSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  effect: z.string().min(1, 'Effect is required'),
});

type AddIssueValues = z.infer<typeof addIssueSchema>;

interface AddIssueFormProps {
  kind: IsmsContextIssueKind;
  onAdd: (params: { description: string; effect: string }) => Promise<void>;
}

export function AddIssueForm({ kind, onAdd }: AddIssueFormProps) {
  return (
    <IsmsAddCard addLabel={`Add ${kind} issue`} formTitle={`New ${kind} issue`}>
      {({ close }) => <AddIssueFields kind={kind} onAdd={onAdd} onClose={close} />}
    </IsmsAddCard>
  );
}

function AddIssueFields({
  kind,
  onAdd,
  onClose,
}: AddIssueFormProps & { onClose: () => void }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<AddIssueValues>({
    resolver: zodResolver(addIssueSchema),
    defaultValues: { description: '', effect: '' },
  });

  const handleAdd = handleSubmit(async (values) => {
    await onAdd(values);
    reset({ description: '', effect: '' });
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <Controller
            control={control}
            name="description"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder={`New ${kind} issue description`}
                aria-label={`New ${kind} issue description`}
              />
            )}
          />
          <FieldError>{errors.description?.message}</FieldError>
        </Field>
        <Field>
          <Controller
            control={control}
            name="effect"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder="Effect on the ISMS and its objectives"
                aria-label={`New ${kind} issue effect`}
              />
            )}
          />
          <FieldError>{errors.effect?.message}</FieldError>
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
          Add {kind} issue
        </Button>
      </HStack>
    </form>
  );
}

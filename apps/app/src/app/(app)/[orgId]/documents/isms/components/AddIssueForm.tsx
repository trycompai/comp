'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Textarea } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { IsmsContextIssueKind } from '../isms-types';

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
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-md border p-3">
      <div className="grid gap-2 md:grid-cols-2">
        <div className="flex flex-col gap-1">
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
          {errors.description && (
            <span className="text-xs text-destructive">{errors.description.message}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
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
          {errors.effect && (
            <span className="text-xs text-destructive">{errors.effect.message}</span>
          )}
        </div>
      </div>
      <div className="flex justify-end">
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
      </div>
    </form>
  );
}

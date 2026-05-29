'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Textarea } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const addPartySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  needsExpectations: z.string().min(1, 'Needs & expectations are required'),
});

type AddPartyValues = z.infer<typeof addPartySchema>;

interface InterestedPartiesFormProps {
  onAdd: (params: AddPartyValues) => Promise<void>;
}

export function InterestedPartiesForm({ onAdd }: InterestedPartiesFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<AddPartyValues>({
    resolver: zodResolver(addPartySchema),
    defaultValues: { name: '', category: '', needsExpectations: '' },
  });

  const handleAdd = handleSubmit(async (values) => {
    await onAdd(values);
    reset({ name: '', category: '', needsExpectations: '' });
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-md border p-3">
      <div className="grid gap-2 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Controller
            control={control}
            name="name"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} placeholder="Party name" aria-label="New interested party name" />
            )}
          />
          {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
        </div>
        <div className="flex flex-col gap-1">
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
          {errors.category && (
            <span className="text-xs text-destructive">{errors.category.message}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
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
          {errors.needsExpectations && (
            <span className="text-xs text-destructive">{errors.needsExpectations.message}</span>
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
          Add interested party
        </Button>
      </div>
    </form>
  );
}

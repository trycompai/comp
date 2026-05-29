'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Textarea } from '@trycompai/design-system';
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
    <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-md border p-3">
      <div className="grid gap-2 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Controller
            control={control}
            name="partyName"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} placeholder="Interested party" aria-label="New requirement party" />
            )}
          />
          {errors.partyName && (
            <span className="text-xs text-destructive">{errors.partyName.message}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
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
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="flex flex-col gap-1">
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
          {errors.requirement && (
            <span className="text-xs text-destructive">{errors.requirement.message}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
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
          {errors.treatment && (
            <span className="text-xs text-destructive">{errors.treatment.message}</span>
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
          Add requirement
        </Button>
      </div>
    </form>
  );
}

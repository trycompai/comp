'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, FieldError, HStack } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useForm } from 'react-hook-form';
import type { ApproverOption } from './IsmsApprovalSection';
import { objectiveSchema, type ObjectiveFormValues } from './objective-schema';
import { IsmsAddCard } from './shared';
import { ObjectivesFormFields } from './ObjectivesFormFields';

export { OBJECTIVE_STATUS_LABELS } from './objectives-status';
export type { ObjectiveFormValues } from './objective-schema';

interface ObjectivesFormProps {
  ownerOptions: ApproverOption[];
  onAdd: (values: ObjectiveFormValues) => Promise<void>;
}

export function ObjectivesForm({ ownerOptions, onAdd }: ObjectivesFormProps) {
  return (
    <IsmsAddCard addLabel="Add objective" formTitle="New objective">
      {({ close }) => (
        <ObjectivesFields ownerOptions={ownerOptions} onAdd={onAdd} onClose={close} />
      )}
    </IsmsAddCard>
  );
}

function ObjectivesFields({
  ownerOptions,
  onAdd,
  onClose,
}: ObjectivesFormProps & { onClose: () => void }) {
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

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset();
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <ObjectivesFormFields control={control} ownerOptions={ownerOptions} />
      <Field>
        <FieldError>{errors.objective?.message}</FieldError>
      </Field>
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

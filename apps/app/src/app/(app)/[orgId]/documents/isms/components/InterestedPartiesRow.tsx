'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Field,
  FieldError,
  Heading,
  HStack,
  Input,
  Stack,
  Textarea,
} from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsInterestedParty } from '../isms-types';
import {
  interestedPartySchema,
  type InterestedPartyFormValues,
} from './interested-party-schema';
import {
  IsmsCardActions,
  IsmsFieldLabel,
  IsmsRegisterCard,
  IsmsRegisterField,
} from './shared';

interface InterestedPartiesRowProps {
  party: IsmsInterestedParty;
  canEdit: boolean;
  onSave: (params: InterestedPartyFormValues) => Promise<void>;
  onDelete: () => Promise<void>;
}

function toFormValues(party: IsmsInterestedParty): InterestedPartyFormValues {
  return {
    name: party.name,
    category: party.category,
    needsExpectations: party.needsExpectations,
  };
}

export function InterestedPartiesRow({
  party,
  canEdit,
  onSave,
  onDelete,
}: InterestedPartiesRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<InterestedPartyFormValues>({
    resolver: zodResolver(interestedPartySchema),
    mode: 'onChange',
    defaultValues: toFormValues(party),
  });

  // Re-sync the form from the latest record whenever it changes while the row is
  // not being edited (e.g. after a successful save revalidates), so re-opening
  // edit never shows stale values.
  useEffect(() => {
    if (!isEditing) reset(toFormValues(party));
  }, [party, isEditing, reset]);

  const handleEdit = () => {
    reset(toFormValues(party));
    setIsEditing(true);
  };

  const handleCancel = () => {
    reset(toFormValues(party));
    setIsEditing(false);
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      await onSave(values);
    } catch {
      // Stay in edit mode with the user's changes when the save fails.
      return;
    }
    setIsEditing(false);
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = canEdit ? (
    <IsmsCardActions
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      isDirty={isDirty && isValid}
      isSaving={isSubmitting}
      isDeleting={isDeleting}
      editLabel="Edit interested party"
      deleteLabel="Delete interested party"
    />
  ) : undefined;

  if (isEditing) {
    return (
      <IsmsRegisterCard headerEnd={actions}>
        <Stack gap="3">
          <div className="grid gap-3 md:grid-cols-2">
            <IsmsFieldLabel label="Name">
              <Field>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { ref: _ref, ...field } }) => (
                    <Input {...field} aria-label="Interested party name" />
                  )}
                />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>
            </IsmsFieldLabel>
            <IsmsFieldLabel label="Category">
              <Field>
                <Controller
                  control={control}
                  name="category"
                  render={({ field: { ref: _ref, ...field } }) => (
                    <Input {...field} aria-label="Interested party category" />
                  )}
                />
                <FieldError>{errors.category?.message}</FieldError>
              </Field>
            </IsmsFieldLabel>
          </div>
          <IsmsFieldLabel label="Needs & expectations">
            <Field>
              <Controller
                control={control}
                name="needsExpectations"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Textarea
                    {...field}
                    rows={3}
                    aria-label="Interested party needs and expectations"
                  />
                )}
              />
              <FieldError>{errors.needsExpectations?.message}</FieldError>
            </Field>
          </IsmsFieldLabel>
        </Stack>
      </IsmsRegisterCard>
    );
  }

  return (
    <IsmsRegisterCard
      header={<Heading level="4">{party.name}</Heading>}
      headerEnd={
        <HStack align="center" gap="2">
          {party.category && <Badge variant="secondary">{party.category}</Badge>}
          {actions}
        </HStack>
      }
    >
      <IsmsRegisterField label="Needs & expectations">{party.needsExpectations}</IsmsRegisterField>
    </IsmsRegisterCard>
  );
}

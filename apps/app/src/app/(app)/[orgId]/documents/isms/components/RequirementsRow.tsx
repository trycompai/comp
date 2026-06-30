'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  FieldError,
  Heading,
  Input,
  Stack,
  Textarea,
} from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsInterestedPartyRequirement } from '../isms-types';
import { requirementSchema, type RequirementFormValues } from './requirement-schema';
import {
  IsmsCardActions,
  IsmsFieldLabel,
  IsmsRegisterCard,
  IsmsRegisterField,
  IsmsSourceBadge,
} from './shared';

/**
 * The values the row emits on save. Shares the canonical requirement schema with
 * the add form so add + edit validate against one source of truth.
 */
export type RequirementRowValues = RequirementFormValues;

interface RequirementsRowProps {
  requirement: IsmsInterestedPartyRequirement;
  canEdit: boolean;
  onSave: (values: RequirementRowValues) => Promise<void>;
  onDelete: () => Promise<void>;
}

function toFormValues(requirement: IsmsInterestedPartyRequirement): RequirementFormValues {
  return {
    partyName: requirement.partyName,
    interestedPartyId: requirement.interestedPartyId ?? '',
    requirement: requirement.requirement,
    treatment: requirement.treatment,
  };
}

export function RequirementsRow({ requirement, canEdit, onSave, onDelete }: RequirementsRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<RequirementFormValues>({
    resolver: zodResolver(requirementSchema),
    mode: 'onChange',
    defaultValues: toFormValues(requirement),
  });

  // Re-sync the form from the latest record whenever it changes while the row is
  // not being edited (e.g. after a successful save revalidates), so re-opening
  // edit never shows stale values.
  useEffect(() => {
    if (!isEditing) reset(toFormValues(requirement));
  }, [requirement, isEditing, reset]);

  const handleEdit = () => {
    reset(toFormValues(requirement));
    setIsEditing(true);
  };

  const handleCancel = () => {
    reset(toFormValues(requirement));
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
      editLabel="Edit requirement"
      deleteLabel="Delete requirement"
    />
  ) : undefined;

  if (isEditing) {
    return (
      <IsmsRegisterCard
        header={<IsmsSourceBadge source={requirement.source} derivedFrom={requirement.derivedFrom} />}
        headerEnd={actions}
      >
        <Stack gap="3">
          {/* interestedPartyId is a system-managed link (set when the row is
              derived from an Interested Parties Register entry). It rides along
              in the form's default values and is carried through on save, but is
              never surfaced as a raw-id input. */}
          <IsmsFieldLabel label="Interested party">
            <Field>
              <Controller
                control={control}
                name="partyName"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Input {...field} aria-label="Requirement party" />
                )}
              />
              <FieldError>{errors.partyName?.message}</FieldError>
            </Field>
          </IsmsFieldLabel>
          <IsmsFieldLabel label="Requirement">
            <Field>
              <Controller
                control={control}
                name="requirement"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Textarea {...field} rows={3} aria-label="Requirement description" />
                )}
              />
              <FieldError>{errors.requirement?.message}</FieldError>
            </Field>
          </IsmsFieldLabel>
          <IsmsFieldLabel label="ISMS treatment">
            <Field>
              <Controller
                control={control}
                name="treatment"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Textarea {...field} rows={3} aria-label="Requirement treatment" />
                )}
              />
              <FieldError>{errors.treatment?.message}</FieldError>
            </Field>
          </IsmsFieldLabel>
        </Stack>
      </IsmsRegisterCard>
    );
  }

  return (
    <IsmsRegisterCard
      header={
        <Stack gap="2">
          <IsmsSourceBadge source={requirement.source} derivedFrom={requirement.derivedFrom} />
          <Heading level="4">{requirement.requirement}</Heading>
        </Stack>
      }
      headerEnd={actions}
    >
      <Stack gap="3">
        <IsmsRegisterField label="Interested party">{requirement.partyName}</IsmsRegisterField>
        <IsmsRegisterField label="ISMS treatment">{requirement.treatment}</IsmsRegisterField>
      </Stack>
    </IsmsRegisterCard>
  );
}
